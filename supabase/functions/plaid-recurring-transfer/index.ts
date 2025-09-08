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
  if (!circleName || !circleName.trim()) {
    return 'Circle Contrib'
  }

  const prefix = 'Circle: '
  const maxLength = 15
  const availableLength = maxLength - prefix.length

  if (circleName.length <= availableLength) {
    return `${prefix}${circleName}`
  }

  return `${prefix}${circleName.substring(0, availableLength)}`
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

    // Validate type-specific data
    if (type === 'circle') {
      const [
        { data: membership, error: membershipError },
        { data: circle, error: circleError }
      ] = typeSpecificResults;

      if (membershipError || !membership) {
        return await handleError(supabase, 'User is not a member of this circle', 403)
      }

      if (circleError || !circle) {
        return await handleError(supabase, 'Circle not found', 404)
      }
    } else {
      const [{ data: goal, error: goalError }] = typeSpecificResults;

      if (goalError || !goal) {
        return await handleError(supabase, 'Savings goal not found', 404)
      }
    }

    if (accountError || !linkedAccount) {
      return await handleError(supabase, 'Bank account not found or not linked to user', 403)
    }

    if (profileError || !userProfile) {
      return await handleError(supabase, 'Failed to fetch user profile', 500)
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

    // Validate all required profile data
    const validationErrors: string[] = [];
    if (!userProfile.display_name) validationErrors.push('display name');
    if (!userEmail) validationErrors.push('email address');
    if (!userProfile.phone) validationErrors.push('phone number');

    if (validationErrors.length > 0) {
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
      const recurringTransferRequest = {
        access_token,
        account_id,
        type: 'debit' as const,
        network: 'ach' as const,
        amount: amount.toFixed(2),
        ach_class: 'ppd' as const,
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
        description: description || createTransferDescription(circle.name),
        schedule,
      };

      // Remove undefined address fields
      if (!recurringTransferRequest.user.address.street) delete recurringTransferRequest.user.address.street;
      if (!recurringTransferRequest.user.address.city) delete recurringTransferRequest.user.address.city;
      if (!recurringTransferRequest.user.address.region) delete recurringTransferRequest.user.address.region;
      if (!recurringTransferRequest.user.address.postal_code) delete recurringTransferRequest.user.address.postal_code;

      const recurringTransferResponse = await plaidClient.transferRecurringCreate(recurringTransferRequest);
      const recurringTransfer = recurringTransferResponse.data.recurring_transfer;

      // Store recurring transfer details in database
      const transferRecord = {
        user_id,
        amount,
        frequency,
        day_of_week,
        day_of_month,
        plaid_recurring_transfer_id: recurringTransfer.recurring_transfer_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let storeError;
      if (type === 'circle') {
        const { error } = await supabase
          .from('recurring_contributions')
          .upsert({
            ...transferRecord,
            circle_id: target_id,
          });
        storeError = error;
      } else {
        const { error } = await supabase
          .from('solo_savings_recurring_contributions')
          .upsert({
            ...transferRecord,
            goal_id: target_id,
          });
        storeError = error;
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
