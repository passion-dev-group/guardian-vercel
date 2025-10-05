import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  const plaidClient = createPlaidClient();

  try {
    const { name, target_amount, target_date, daily_transfer_enabled, account_id } = await req.json();
    
    if (!name || !target_amount || !account_id) {
      return new Response(JSON.stringify({ error: 'name, target_amount, and account_id are required' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // Authenticate caller
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 
      });
    }

    // Use service client for privileged reads/writes
    const svc = createClient(supabaseUrl, serviceKey);

    // Validate bank account exists
    const { data: linkedAccount, error: accountError } = await svc
      .from('linked_bank_accounts')
      .select('id, account_id, plaid_account_id')
      .eq('user_id', user.id)
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single();

    if (accountError || !linkedAccount) {
      return new Response(JSON.stringify({ error: 'Bank account not found or not active' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 
      });
    }

    // Calculate daily amount (divide target by 90 days)
    const dailyAmount = (target_amount / 90).toFixed(2);

    // Create test clock for sandbox mode (if daily transfers enabled)
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
    let testClockId: string | undefined;

    if (daily_transfer_enabled && plaidEnv === 'sandbox') {
      try {
        const virtualTime = new Date();
        virtualTime.setHours(12, 0, 0, 0);
        
        const testClockResponse = await plaidClient.sandboxTransferTestClockCreate({
          virtual_time: virtualTime.toISOString()
        } as any);
        
        testClockId = testClockResponse.data.test_clock.id;
        console.log(`Created test clock for solo goal: ${testClockId}`);
      } catch (clockError) {
        console.error('Failed to create test clock:', clockError);
        // Continue without test clock - will use production mode
      }
    }

    // Create the goal
    const { data: createdGoal, error: goalError } = await svc
      .from('solo_savings_goals')
      .insert({
        user_id: user.id,
        name,
        target_amount,
        target_date: target_date || null,
        current_amount: 0,
        daily_transfer_enabled: daily_transfer_enabled || false,
      })
      .select()
      .single();

    if (goalError) {
      console.error('Failed to create goal:', goalError);
      return new Response(JSON.stringify({ error: 'Failed to create goal', details: goalError.message }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 
      });
    }

    console.log(`✅ Created goal: ${createdGoal.id}`);

    // If daily transfers enabled, store the recurring contribution config
    if (daily_transfer_enabled) {
      const { error: recurringError } = await svc
        .from('solo_savings_recurring_contributions')
        .insert({
          goal_id: createdGoal.id,
          user_id: user.id,
          amount: parseFloat(dailyAmount),
          frequency: 'daily',
          linked_bank_account_id: linkedAccount.id,
          test_clock_id: testClockId,
          is_active: true,
        });

      if (recurringError) {
        console.error('Failed to store recurring contribution config:', recurringError);
        // Don't fail the whole operation, just log the error
        console.warn('Goal created but recurring config failed. Manual intervention may be required.');
      } else {
        console.log(`✅ Stored recurring contribution config for goal ${createdGoal.id}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      goal_id: createdGoal.id,
      test_clock_id: testClockId,
      daily_amount: parseFloat(dailyAmount),
      message: daily_transfer_enabled 
        ? 'Goal created with daily transfer enabled. Transfers will be processed by cron job.'
        : 'Goal created successfully'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error setting up solo goal recurring transfer:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to set up recurring transfer',
      details: error?.response?.data || error?.message || String(error)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

