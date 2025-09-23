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
      target_name,
      test_clock_id
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

    // Calculate schedule based on frequency - support all frequencies via interval_count
    let schedule: any;
    switch (frequency) {
      case 'weekly':
        schedule = {
          interval_unit: 'week',
          interval_count: 1,
          interval_execution_day: day_of_week || 1, // 1-5 for Monday-Friday
        };
        break;
      case 'biweekly':
        schedule = {
          interval_unit: 'week',
          interval_count: 2,
          interval_execution_day: day_of_week || 1, // 1-5 for Monday-Friday
        };
        break;
      case 'monthly':
        // Validate interval_execution_day for monthly schedules
        const executionDay = day_of_month || 1;
        if (executionDay < 1 || executionDay > 28) {
          if (executionDay < -5 || executionDay > -1) {
            return await handleError(supabase, 'For monthly schedules, interval_execution_day must be 1-28 or -1 to -5', 400);
          }
        }
        schedule = {
          interval_unit: 'month',
          interval_count: 1,
          interval_execution_day: executionDay,
        };
        break;
      case 'quarterly':
        // Validate interval_execution_day for quarterly schedules (monthly with count=3)
        const quarterlyExecutionDay = day_of_month || 1;
        if (quarterlyExecutionDay < 1 || quarterlyExecutionDay > 28) {
          if (quarterlyExecutionDay < -5 || quarterlyExecutionDay > -1) {
            return await handleError(supabase, 'For quarterly schedules, interval_execution_day must be 1-28 or -1 to -5', 400);
          }
        }
        schedule = {
          interval_unit: 'month',
          interval_count: 3,
          interval_execution_day: quarterlyExecutionDay,
        };
        break;
      case 'yearly':
        // Validate interval_execution_day for yearly schedules (monthly with count=12)
        const yearlyExecutionDay = day_of_month || 1;
        if (yearlyExecutionDay < 1 || yearlyExecutionDay > 28) {
          if (yearlyExecutionDay < -5 || yearlyExecutionDay > -1) {
            return await handleError(supabase, 'For yearly schedules, interval_execution_day must be 1-28 or -1 to -5', 400);
          }
        }
        schedule = {
          interval_unit: 'month',
          interval_count: 12,
          interval_execution_day: yearlyExecutionDay,
        };
        break;
      default:
        return await handleError(supabase, 'Invalid frequency. Must be one of: weekly, biweekly, monthly, quarterly, yearly', 400);
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

      const recurringTransferRequest: any = {
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

      // Handle test clock for sandbox environment
      const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
      let testClockId: string | undefined = test_clock_id; // Use provided test_clock_id if available
      
      if (plaidEnv === 'sandbox') {
        if (test_clock_id) {
          // Use the provided test clock ID
          testClockId = test_clock_id;
          recurringTransferRequest.test_clock_id = testClockId;
          console.log('Using provided test clock for sandbox testing:', testClockId);
        } else {
          // Create a new test clock automatically for sandbox testing
          console.log("creating test clock");
          try {
            // Set virtual time to a known Monday (like the Plaid example)
            const virtualTime = new Date('2022-11-14T07:00:00-08:00').toISOString();
            const testClockResponse = await plaidClient.sandboxTransferTestClockCreate({
              virtual_time: virtualTime
            });
            
            if (testClockResponse.data.test_clock.test_clock_id) {
              testClockId = testClockResponse.data.test_clock.test_clock_id;
              recurringTransferRequest.test_clock_id = testClockId;
              console.log('Auto-created test clock for sandbox testing:', testClockId);
              console.log('Virtual time set to:', virtualTime);
            }else{
              console.error('Failed to create test clock:', testClockResponse.data);
            }
          } catch (testClockError) {
            console.warn('Failed to create test clock, proceeding without it:', testClockError);
            // Continue without test clock if creation fails
          }
        }
      }
// 
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
        test_clock_id: recurringTransferRequest.test_clock_id,
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

      // In sandbox mode, advance test clock to trigger recurring transfers
      if (plaidEnv === 'sandbox' && testClockId) {
        try {
          // Advance test clock to the first execution day to trigger the first transfer
          const firstExecutionDate = new Date(scheduleWithStartDate.start_date);
          const advanceTime = new Date(firstExecutionDate);
          advanceTime.setHours(23, 59, 0, 0); // End of day
          advanceTime.setTime(advanceTime.getTime() - 8 * 60 * 60 * 1000); // Convert to PST
          
          console.log('Advancing test clock to trigger first transfer:', advanceTime.toISOString());
          await plaidClient.sandboxTransferTestClockAdvance({
            test_clock_id: testClockId,
            virtual_time: advanceTime.toISOString()
          });
          
          // Wait a moment for the transfer to be generated
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check the recurring transfer to see if transfers were generated
          const recurringTransferDetails = await plaidClient.transferRecurringGet({
            recurring_transfer_id: recurringTransfer.recurring_transfer_id
          });
          
          if (recurringTransferDetails.data.recurring_transfer) {
            const transferCount = recurringTransferDetails.data.recurring_transfer.transfer_ids?.length || 0;
            console.log(`Recurring transfer status: ${recurringTransferDetails.data.recurring_transfer.status}`);
            console.log(`Generated ${transferCount} transfer(s) so far`);
          }
        } catch (advanceError) {
          console.warn('Failed to advance test clock or check recurring transfer:', advanceError);
          // Continue even if advancement fails
        }
      }

      // Calculate next contribution date based on frequency and schedule
      const calculateNextContributionDate = (freq: string, dayOfWeek?: number, dayOfMonth?: number): Date => {
        const now = new Date();
        const nextDate = new Date(now);
        
        switch (freq) {
          case 'weekly':
            const targetDay = dayOfWeek || 1; // Default to Monday (1-5 for Monday-Friday)
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
            // Handle negative days (last day of month, etc.)
            if (targetDayMonth < 0) {
              // For negative days, set to last day of next month minus the absolute value
              const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(lastDay + targetDayMonth + 1);
            } else {
              // For positive days, ensure we don't exceed the number of days in the month
              const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(Math.min(targetDayMonth, maxDay));
            }
            break;
          case 'quarterly':
            const targetDayQuarter = dayOfMonth || 1;
            nextDate.setMonth(now.getMonth() + 3);
            // Handle negative days (last day of month, etc.)
            if (targetDayQuarter < 0) {
              const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(lastDay + targetDayQuarter + 1);
            } else {
              const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(Math.min(targetDayQuarter, maxDay));
            }
            break;
          case 'yearly':
            const targetDayYear = dayOfMonth || 1;
            nextDate.setFullYear(now.getFullYear() + 1);
            // Handle negative days (last day of month, etc.)
            if (targetDayYear < 0) {
              const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(lastDay + targetDayYear + 1);
            } else {
              const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
              nextDate.setDate(Math.min(targetDayYear, maxDay));
            }
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
        test_clock_id: testClockId || null,
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
          test_clock_id: testClockId, // Include test clock ID for sandbox testing
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
