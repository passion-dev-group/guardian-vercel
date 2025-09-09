import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Helper function to handle errors
async function handleError(
  supabase: any,
  errorMessage: string,
  statusCode: number = 500,
  logError?: any
) {
  if (logError) {
    console.error(errorMessage, logError)
  } else {
    console.error(errorMessage)
  }

  return new Response(
    JSON.stringify({
      error: errorMessage,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
  )
}

// Helper function to create transfer description
function createTransferDescription(circleName: string): string {
  const maxLength = 15
  
  if (!circleName || !circleName.trim()) {
    return 'Circle Contrib'
  }

  // For recurring transfers, use a shorter format
  if (circleName.length <= maxLength) {
    return circleName.substring(0, maxLength)
  }

  // Truncate to fit within 15 characters
  return circleName.substring(0, maxLength)
}

// Helper function to create Plaid client
function createPlaidClient() {
  const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')!
  const plaidSecret = Deno.env.get('PLAID_SECRET')!
  const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'

  const configuration = new Configuration({
    basePath: plaidEnv === "sandbox" ? PlaidEnvironments.sandbox : PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  })

  return new PlaidApi(configuration)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const {
      user_id,
      amount,
      account_id,
      access_token,
      frequency,
      day_of_week,
      day_of_month,
      description,
      type,
      target_id,
      target_name
    } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate required fields
    if (!user_id || !amount || !account_id || !access_token || !frequency || !type || !target_id || !target_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate type
    if (type !== 'circle' && type !== 'savings_goal') {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be either "circle" or "savings_goal"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch all required data in parallel
    const queries = [
      // Always fetch linked bank account and user profile
      supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user_id)
        .eq('account_id', account_id)
        .eq('is_active', true)
        .single(),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single()
    ];

    // Add type-specific queries
    if (type === 'circle') {
      queries.push(
        supabase
          .from('circle_members')
          .select('*')
          .eq('circle_id', target_id)
          .eq('user_id', user_id)
          .single(),
        supabase
          .from('circles')
          .select('*')
          .eq('id', target_id)
          .single()
      );
    } else {
      queries.push(
        supabase
          .from('solo_savings_goals')
          .select('*')
          .eq('id', target_id)
          .eq('user_id', user_id)
          .single()
      );
    }

    const results = await Promise.all(queries);
    const [
      { data: linkedAccount, error: accountError },
      { data: userProfile, error: profileError },
      ...typeSpecificResults
    ] = results;

    // Validate common data
    if (accountError || !linkedAccount) {
      return await handleError(supabase, 'Bank account not found or not linked to user', 403)
    }

    if (profileError || !userProfile) {
      return await handleError(supabase, 'Failed to fetch user profile', 500)
    }

    // Validate type-specific data and extract entities
    let circle = null;
    let goal = null;
    
    if (type === 'circle') {
      const [
        { data: membership, error: membershipError },
        { data: circleData, error: circleError }
      ] = typeSpecificResults;

      if (membershipError || !membership) {
        return await handleError(supabase, 'User is not a member of this circle', 403)
      }

      if (circleError || !circleData) {
        return await handleError(supabase, 'Circle not found', 404)
      }
      
      circle = circleData;
    } else {
      const [{ data: goalData, error: goalError }] = typeSpecificResults;

      if (goalError || !goalData) {
        return await handleError(supabase, 'Savings goal not found', 404)
      }
      
      goal = goalData;
    }

    // Initialize Plaid client
    const plaidClient = createPlaidClient()

    // Get user's email from auth.users if not in profile
    let userEmail = userProfile.email;
    if (!userEmail) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(user_id);
        if (!authError && user) {
          userEmail = user.email;
        }
      } catch (authError) {
        console.error('Error fetching user email from auth:', authError);
      }
    }

    // Log profile data for debugging
    console.log('Profile validation check:', {
      user_id,
      display_name: userProfile.display_name,
      email: userEmail,
      phone: userProfile.phone,
      address_street: userProfile.address_street,
      address_city: userProfile.address_city,
      address_state: userProfile.address_state,
      address_zip: userProfile.address_zip
    });

    // Validate all required profile data
    const validationErrors: string[] = [];
    if (!userProfile.display_name) validationErrors.push('display name');
    if (!userEmail) validationErrors.push('email address');
    if (!userProfile.phone) validationErrors.push('phone number');

    if (validationErrors.length > 0) {
      console.error('Profile validation failed:', validationErrors);
      return await handleError(
        supabase,
        `Profile incomplete. Please add: ${validationErrors.join(', ')}`,
        400
      )
    }

    // Calculate schedule based on frequency
    let schedule: any;
    switch (frequency) {
      case 'daily':
        schedule = {
          interval_unit: 'day',
          interval_count: 1,
        };
        break;
      case 'weekly':
        schedule = {
          interval_unit: 'week',
          interval_count: 1,
          interval_execution_day: day_of_week || 1, // Default to Monday
        };
        break;
      case 'biweekly':
        schedule = {
          interval_unit: 'week',
          interval_count: 2,
          interval_execution_day: day_of_week || 1,
        };
        break;
      case 'monthly':
        schedule = {
          interval_unit: 'month',
          interval_count: 1,
          interval_execution_day: day_of_month || 1,
        };
        break;
      case 'quarterly':
        schedule = {
          interval_unit: 'month',
          interval_count: 3,
          interval_execution_day: day_of_month || 1,
        };
        break;
      case 'yearly':
        schedule = {
          interval_unit: 'month',
          interval_count: 12,
          interval_execution_day: day_of_month || 1,
        };
        break;
      default:
        return await handleError(supabase, 'Invalid frequency. Must be one of: daily, weekly, biweekly, monthly, quarterly, yearly', 400);
    }

    // Create recurring transfer
    try {
      // Generate idempotency key to prevent duplicate transfers
      const idempotencyKey = `recurring-${user_id}-${target_id}-${Date.now()}`;
      
      // Calculate start date (next business day)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      // If it's a weekend, move to Monday
      if (startDate.getDay() === 0) { // Sunday
        startDate.setDate(startDate.getDate() + 1);
      } else if (startDate.getDay() === 6) { // Saturday
        startDate.setDate(startDate.getDate() + 2);
      }
      
      // Add start_date to schedule
      const scheduleWithStartDate = {
        ...schedule,
        start_date: startDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
      };

      const recurringTransferRequest = {
        access_token,
        account_id,
        type: 'debit' as const,
        network: 'ach' as const,
        amount: amount.toFixed(2),
        ach_class: 'ppd' as const,
        idempotency_key: idempotencyKey,
        user: {
          legal_name: userProfile.display_name,
          phone_number: userProfile.phone,
          email_address: userEmail,
          address: {
            street: userProfile.address_street || undefined,
            city: userProfile.address_city || undefined,
            region: userProfile.address_state || undefined,
            postal_code: userProfile.address_zip || undefined,
            country: userProfile.address_country || 'US',
          },
        },
        description: (description || createTransferDescription(type === 'circle' ? (circle as any)?.name : (goal as any)?.name || target_name)).substring(0, 15),
        schedule: scheduleWithStartDate,
      };

      // Remove undefined address fields
      if (!recurringTransferRequest.user.address.street) delete recurringTransferRequest.user.address.street;
      if (!recurringTransferRequest.user.address.city) delete recurringTransferRequest.user.address.city;
      if (!recurringTransferRequest.user.address.region) delete recurringTransferRequest.user.address.region;
      if (!recurringTransferRequest.user.address.postal_code) delete recurringTransferRequest.user.address.postal_code;

      // Log the request being sent to Plaid (without sensitive data)
      console.log('Sending recurring transfer request to Plaid:', {
        account_id: recurringTransferRequest.account_id,
        amount: recurringTransferRequest.amount,
        type: recurringTransferRequest.type,
        network: recurringTransferRequest.network,
        ach_class: recurringTransferRequest.ach_class,
        idempotency_key: recurringTransferRequest.idempotency_key,
        description: recurringTransferRequest.description,
        schedule: recurringTransferRequest.schedule,
        user: {
          legal_name: recurringTransferRequest.user.legal_name,
          phone_number: recurringTransferRequest.user.phone_number ? '[REDACTED]' : null,
          email_address: recurringTransferRequest.user.email_address ? '[REDACTED]' : null,
          address: recurringTransferRequest.user.address
        }
      });

      console.log('About to call Plaid API...');
      const recurringTransferResponse = await plaidClient.transferRecurringCreate(recurringTransferRequest);
      const recurringTransfer = recurringTransferResponse.data.recurring_transfer;
      console.log('Plaid API call successful:', {
        recurring_transfer_id: recurringTransfer.recurring_transfer_id,
        status: recurringTransfer.status
      });

      // Calculate next contribution date based on frequency and schedule
      const calculateNextContributionDate = (freq: string, dayOfWeek?: number, dayOfMonth?: number): Date => {
        const now = new Date();
        const nextDate = new Date(now);
        
        switch (freq) {
          case 'daily':
            nextDate.setDate(now.getDate() + 1);
            break;
          case 'weekly':
            const targetDay = dayOfWeek || 1; // Default to Monday
            const currentDay = now.getDay();
            const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
            nextDate.setDate(now.getDate() + daysUntilTarget);
            break;
          case 'biweekly':
            const targetDayBi = dayOfWeek || 1;
            const currentDayBi = now.getDay();
            const daysUntilTargetBi = (targetDayBi - currentDayBi + 7) % 7 || 7;
            nextDate.setDate(now.getDate() + daysUntilTargetBi);
            break;
          case 'monthly':
            const targetDayMonth = dayOfMonth || 1;
            nextDate.setMonth(now.getMonth() + 1);
            nextDate.setDate(Math.min(targetDayMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
            break;
          case 'quarterly':
            const targetDayQuarter = dayOfMonth || 1;
            nextDate.setMonth(now.getMonth() + 3);
            nextDate.setDate(Math.min(targetDayQuarter, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
            break;
          case 'yearly':
            const targetDayYear = dayOfMonth || 1;
            nextDate.setFullYear(now.getFullYear() + 1);
            nextDate.setDate(Math.min(targetDayYear, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
            break;
          default:
            // Default to next week
            nextDate.setDate(now.getDate() + 7);
        }
        
        return nextDate;
      };

      const nextContributionDate = calculateNextContributionDate(frequency, day_of_week, day_of_month);

      // Store recurring transfer details in database
      const transferRecord = {
        user_id,
        amount,
        frequency,
        day_of_week,
        day_of_month,
        plaid_recurring_transfer_id: recurringTransfer.recurring_transfer_id,
        is_active: true,
        next_contribution_date: nextContributionDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('About to store in database:', {
        type,
        target_id,
        transferRecord
      });

      let storeError;
      if (type === 'circle') {
        const { error } = await supabase
          .from('recurring_contributions')
          .upsert({
            ...transferRecord,
            circle_id: target_id,
          });
        storeError = error;
        console.log('Circle storage result:', { error });
      } else {
        const { error } = await supabase
          .from('solo_savings_recurring_contributions')
          .upsert({
            ...transferRecord,
            goal_id: target_id,
          });
        storeError = error;
        console.log('Solo savings storage result:', { error });
      }

      if (storeError) {
        console.error('Error storing recurring transfer:', storeError);
        // Try to cancel the recurring transfer if we couldn't store it
        try {
          await plaidClient.transferRecurringCancel({
            recurring_transfer_id: recurringTransfer.recurring_transfer_id,
          });
        } catch (cancelError) {
          console.error('Error canceling recurring transfer after storage failure:', cancelError);
        }
        throw storeError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          recurring_transfer_id: recurringTransfer.recurring_transfer_id,
          message: 'Recurring transfer created successfully',
          amount: amount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (plaidError) {
      console.error('Plaid recurring transfer error:', plaidError);
      
      // Log more detailed error information
      const errorDetails = {
        user_id,
        amount,
        frequency,
        type,
        target_id,
        plaidError: plaidError?.response?.data || plaidError?.message || plaidError
      };
      console.error('Detailed error info:', JSON.stringify(errorDetails, null, 2));
      
      return await handleError(
        supabase,
        'Failed to create recurring transfer',
        400,
        plaidError
      );
    }

  } catch (error) {
    return await handleError(
      supabase,
      'Internal server error',
      500,
      error
    );
  }
});
