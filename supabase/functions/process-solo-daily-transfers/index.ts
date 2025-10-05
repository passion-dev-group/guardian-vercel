import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createPlaidClient() {
  const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')!;
  const plaidSecret = Deno.env.get('PLAID_SECRET')!;
  const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';

  const configuration = new Configuration({
    basePath: plaidEnv === "sandbox" ? PlaidEnvironments.sandbox : PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  });

  return new PlaidApi(configuration);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const plaidClient = createPlaidClient();
  const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';

  try {
    console.log('🔄 Starting solo daily transfer processing...');

    // Fetch all active solo savings goals with daily transfers enabled
    const { data: activeContributions, error: fetchError } = await supabase
      .from('solo_savings_recurring_contributions')
      .select(`
        *,
        solo_savings_goals!inner (
          id,
          name,
          target_amount,
          current_amount,
          target_date,
          daily_transfer_enabled,
          user_id
        ),
        linked_bank_accounts!inner (
          id,
          plaid_access_token,
          plaid_account_id,
          account_id,
          institution_name,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('solo_savings_goals.daily_transfer_enabled', true)
      .eq('linked_bank_accounts.is_active', true);

    if (fetchError) {
      console.error('Error fetching active contributions:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch active contributions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      });
    }

    if (!activeContributions || activeContributions.length === 0) {
      console.log('No active solo goals with daily transfers found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active solo goals to process',
        processed: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${activeContributions.length} active solo goals to process`);

    const results: any[] = [];

    // Process each contribution
    for (const contribution of activeContributions) {
      const goal = contribution.solo_savings_goals;
      const bankAccount = contribution.linked_bank_accounts;

      try {
        console.log(`Processing goal: ${goal.name} (${goal.id})`);

        // Check if goal has reached target
        if (goal.current_amount >= goal.target_amount) {
          console.log(`Goal ${goal.id} has reached target amount. Skipping.`);
          results.push({
            goal_id: goal.id,
            goal_name: goal.name,
            success: true,
            skipped: true,
            reason: 'Target amount reached'
          });
          continue;
        }

        // Check if we already processed today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingTransfer } = await supabase
          .from('solo_savings_transactions')
          .select('id')
          .eq('goal_id', goal.id)
          .gte('transaction_date', `${today}T00:00:00`)
          .lte('transaction_date', `${today}T23:59:59`)
          .eq('type', 'recurring_contribution')
          .maybeSingle();

        if (existingTransfer) {
          console.log(`Transfer already processed today for goal ${goal.id}`);
          results.push({
            goal_id: goal.id,
            goal_name: goal.name,
            success: true,
            skipped: true,
            reason: 'Already processed today'
          });
          continue;
        }

        // Fetch user profile for transfer details
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', goal.user_id)
          .single();

        const { data: auth } = await supabase.auth.admin.getUserById(goal.user_id);
        const userEmail = auth?.user?.email || 'no-email@example.com';

        // Create individual transfer
        const idempotencyKey = `solo-daily-${goal.id}-${today}`;
        const transferRequest: any = {
          access_token: bankAccount.plaid_access_token,
          account_id: bankAccount.plaid_account_id,
          type: 'debit',
          network: 'ach',
          amount: contribution.amount.toFixed(2),
          ach_class: 'ppd',
          idempotency_key: idempotencyKey,
          user: {
            legal_name: profile?.display_name || 'User',
            phone_number: profile?.phone || undefined,
            email_address: userEmail,
            address: {
              street: profile?.address_street || undefined,
              city: profile?.address_city || undefined,
              region: profile?.address_state || undefined,
              postal_code: profile?.address_zip || undefined,
              country: profile?.address_country || 'US',
            },
          },
          description: `Daily ${goal.name.substring(0, 10)}`,
        };

        // Add test clock if sandbox
        if (plaidEnv === 'sandbox' && contribution.test_clock_id) {
          transferRequest.test_clock_id = contribution.test_clock_id;
        }

        // Remove undefined address fields
        if (!transferRequest.user.address.street) delete transferRequest.user.address.street;
        if (!transferRequest.user.address.city) delete transferRequest.user.address.city;
        if (!transferRequest.user.address.region) delete transferRequest.user.address.region;
        if (!transferRequest.user.address.postal_code) delete transferRequest.user.address.postal_code;

        console.log(`Creating transfer for goal ${goal.id}, amount: ${contribution.amount}`);
        const transferResponse = await plaidClient.transferCreate(transferRequest as any);
        const transfer = transferResponse.data.transfer;

        console.log(`✅ Transfer created: ${transfer.id}`);

        // Record transaction in database
        const { error: transactionError } = await supabase
          .from('solo_savings_transactions')
          .insert({
            goal_id: goal.id,
            user_id: goal.user_id,
            amount: contribution.amount,
            type: 'recurring_contribution',
            status: 'pending',
            transaction_date: new Date().toISOString(),
            plaid_transfer_id: transfer.id,
            description: `Daily automated transfer`,
            metadata: {
              processed_by: 'cron',
              test_clock_id: contribution.test_clock_id,
              plaid_response: transfer
            }
          });

        if (transactionError) {
          console.error(`Failed to record transaction for goal ${goal.id}:`, transactionError);
          results.push({
            goal_id: goal.id,
            goal_name: goal.name,
            success: false,
            error: 'Failed to record transaction in database'
          });
        } else {
          results.push({
            goal_id: goal.id,
            goal_name: goal.name,
            success: true,
            transfer_id: transfer.id,
            amount: contribution.amount
          });
        }

      } catch (error: any) {
        console.error(`Error processing goal ${goal.id}:`, error);
        results.push({
          goal_id: goal.id,
          goal_name: goal.name,
          success: false,
          error: error?.response?.data || error?.message || 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ Processed ${successCount} successful transfers, ${failureCount} failures`);

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Fatal error in solo daily transfer processing:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process solo daily transfers',
      details: error?.message || String(error)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

