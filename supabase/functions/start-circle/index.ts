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

function createTransferDescription(circleName: string): string {
  const maxLength = 15;
  if (!circleName || !circleName.trim()) return 'Circle Contrib';
  return circleName.substring(0, maxLength);
}

function calculateNextContributionDate(freq: string, dayOfWeek?: number, dayOfMonth?: number): Date {
  const now = new Date();
  const nextDate = new Date(now);
  switch (freq) {
    case 'weekly': {
      const targetDay = dayOfWeek || 1; // 1-5 Mon-Fri
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      nextDate.setDate(now.getDate() + daysUntilTarget);
      break;
    }
    case 'biweekly': {
      const targetDay = dayOfWeek || 1;
      const currentDay = now.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      nextDate.setDate(now.getDate() + daysUntilTarget);
      break;
    }
    case 'monthly': {
      const executionDay = dayOfMonth || 1;
      nextDate.setMonth(now.getMonth() + 1);
      if (executionDay < 0) {
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(lastDay + executionDay + 1);
      } else {
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(executionDay, maxDay));
      }
      break;
    }
    case 'quarterly': {
      const executionDay = dayOfMonth || 1;
      nextDate.setMonth(now.getMonth() + 3);
      if (executionDay < 0) {
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(lastDay + executionDay + 1);
      } else {
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(executionDay, maxDay));
      }
      break;
    }
    case 'yearly': {
      const executionDay = dayOfMonth || 1;
      nextDate.setFullYear(now.getFullYear() + 1);
      if (executionDay < 0) {
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(lastDay + executionDay + 1);
      } else {
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(executionDay, maxDay));
      }
      break;
    }
    default:
      nextDate.setDate(now.getDate() + 7);
  }
  return nextDate;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const plaidClient = createPlaidClient();

  try {
    const { circle_id } = await req.json();
    if (!circle_id) {
      return new Response(JSON.stringify({ error: 'circle_id is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // Check admin membership
    const { data: membership, error: membershipError } = await userSupabase
      .from('circle_members')
      .select('is_admin')
      .eq('circle_id', circle_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership?.is_admin) {
      return new Response(JSON.stringify({ error: 'Only circle admins can start a circle' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // Use service client for privileged reads/writes
    const svc = createClient(supabaseUrl, serviceKey);

    // Fetch circle details
    const { data: circle, error: circleError } = await svc
      .from('circles')
      .select('id, name, frequency, contribution_amount, status')
      .eq('id', circle_id)
      .single();

    if (circleError || !circle) {
      return new Response(JSON.stringify({ error: 'Circle not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    if (circle.status === 'active' || circle.status === 'started' || circle.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Circle is not eligible to start' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Step 1: Get all authorized members in the circle
    console.log(`Step 1: Fetching authorized members for circle ${circle_id}...`);
    const { data: authorizations, error: authError } = await svc
      .from('circle_ach_authorizations')
      .select('user_id, plaid_account_id, linked_bank_account_id')
      .eq('circle_id', circle_id)
      .eq('status', 'authorized');

    if (authError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch authorizations' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    if (!authorizations || authorizations.length === 0) {
      return new Response(JSON.stringify({ error: 'No authorized members found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    console.log(`Found ${authorizations.length} authorized members`);
    // const startDate = new Date("2025-09-22");
    const startDate = new Date();
    // Step 2: Create a test clock for sandbox environment
    let testClockId: string | undefined;
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
    if (plaidEnv === 'sandbox') {
      console.log('Step 2: Creating test clock for sandbox environment...');
      const virtualTime = startDate.toISOString();
      try {
        const testClockResponse = await plaidClient.sandboxTransferTestClockCreate({ virtual_time: virtualTime });
        testClockId = testClockResponse.data.test_clock.test_clock_id;
        console.log(`Test clock created: ${testClockId} with virtual time: ${virtualTime}`);
        
        // Save test clock ID to circles table
        const { error: testClockUpdateError } = await svc
          .from('circles')
          .update({ test_clock_id: testClockId })
          .eq('id', circle.id);
        
        if (testClockUpdateError) {
          console.warn('Failed to save test clock ID to circle:', testClockUpdateError);
        } else {
          console.log(`Test clock ID saved to circle: ${testClockId}`);
        }
      } catch (e) {
        console.warn('Failed to create test clock:', e);
        // ignore; proceed without clock
      }
    }
    // Build schedule
    
    startDate.setDate(startDate.getDate() + 1);
    if (startDate.getDay() === 0) startDate.setDate(startDate.getDate() + 1);
    if (startDate.getDay() === 6) startDate.setDate(startDate.getDate() + 2);
    const interval_execution_day = startDate.getDay();
    const schedule: any = { start_date: startDate.toISOString().split('T')[0] };
    switch (circle.frequency) {
      case 'weekly':
        schedule.interval_unit = 'week';
        schedule.interval_count = 1;
        schedule.interval_execution_day = interval_execution_day;
        break;
      case 'biweekly':
        schedule.interval_unit = 'week';
        schedule.interval_count = 2;
        schedule.interval_execution_day = interval_execution_day;
        break;
      case 'monthly':
        schedule.interval_unit = 'month';
        schedule.interval_count = 1;
        schedule.interval_execution_day = interval_execution_day;
        break;
      case 'quarterly':
        schedule.interval_unit = 'month';
        schedule.interval_count = 3;
        schedule.interval_execution_day = interval_execution_day;
        break;
      case 'yearly':
        schedule.interval_unit = 'month';
        schedule.interval_count = 12;
        schedule.interval_execution_day = interval_execution_day;
        break;
      default:
        schedule.interval_unit = 'week';
        schedule.interval_count = 1;
        schedule.interval_execution_day = interval_execution_day;
    }

    // Step 3: Create recurring transfers with the test clock for all members
    console.log('Step 3: Creating recurring transfers for authorized members...');
    const results: Array<{ user_id: string; success: boolean; error?: string; recurring_transfer_id?: string }> = [];

    for (const auth of authorizations) {
      try {
        // Fetch linked bank account securely
        let linkedAccount: any = null;
        if (auth.linked_bank_account_id) {
          const { data, error } = await svc
            .from('linked_bank_accounts')
            .select('*')
            .eq('id', auth.linked_bank_account_id)
            .eq('user_id', auth.user_id)
            .eq('is_active', true)
            .maybeSingle();
          if (error) throw error;
          linkedAccount = data;
        } else {
          // Fallback: match by user_id + Plaid account_id
          const { data, error } = await svc
            .from('linked_bank_accounts')
            .select('*')
            .eq('user_id', auth.user_id)
            .eq('account_id', auth.plaid_account_id)
            .eq('is_active', true)
            .maybeSingle();
          if (error) throw error;
          linkedAccount = data;
        }

        if (!linkedAccount) {
          results.push({ user_id: auth.user_id, success: false, error: 'Active bank account not found' });
          continue;
        }

        // Fetch user profile (required by Plaid)
        const { data: profile, error: profileError } = await svc
          .from('profiles')
          .select('*')
          .eq('id', auth.user_id)
          .single();
        if (profileError || !profile) {
          results.push({ user_id: auth.user_id, success: false, error: 'Profile not found' });
          continue;
        }

        // Get user email from auth if needed
        let userEmail = profile.email;
        if (!userEmail) {
          try {
            const { data: authUser } = await svc.auth.admin.getUserById(auth.user_id);
            userEmail = authUser?.user?.email;
          } catch (_) { }
        }


        const idempotencyKey = `recurring-${auth.user_id}-${circle.id}-${Date.now()}`;
        const request: any = {
          access_token: linkedAccount.plaid_access_token,
          account_id: linkedAccount.account_id,
          type: 'debit' as const,
          network: 'ach' as const,
          amount: Number(circle.contribution_amount).toFixed(2),
          ach_class: 'ppd' as const,
          idempotency_key: idempotencyKey,
          user: {
            legal_name: profile.display_name,
            phone_number: profile.phone,
            email_address: userEmail,
            address: {
              street: profile.address_street || undefined,
              city: profile.address_city || undefined,
              region: profile.address_state || undefined,
              postal_code: profile.address_zip || undefined,
              country: profile.address_country || 'US',
            },
          },
          description: createTransferDescription(circle.name),
          schedule,
        };

        if (plaidEnv === 'sandbox' && testClockId) {
          request.test_clock_id = testClockId;
        }

        // Remove undefined address fields
        if (!request.user.address.street) delete request.user.address.street;
        if (!request.user.address.city) delete request.user.address.city;
        if (!request.user.address.region) delete request.user.address.region;
        if (!request.user.address.postal_code) delete request.user.address.postal_code;

        const resp = await plaidClient.transferRecurringCreate(request);
        const recurring = resp.data.recurring_transfer;

        const nextContributionDate = calculateNextContributionDate(circle.frequency, interval_execution_day);

        const { error: upsertError } = await svc
          .from('recurring_contributions')
          .upsert({
            user_id: auth.user_id,
            circle_id: circle.id,
            amount: circle.contribution_amount,
            frequency: circle.frequency,
            day_of_week: undefined,
            day_of_month: 1,
            plaid_recurring_transfer_id: recurring.recurring_transfer_id,
            is_active: true,
            next_contribution_date: nextContributionDate.toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            test_clock_id: testClockId || null,
          });
        if (upsertError) throw upsertError;

        results.push({ user_id: auth.user_id, success: true, recurring_transfer_id: recurring.recurring_transfer_id });
      } catch (e: any) {
        console.error('Member processing failed', auth.user_id, e);
        results.push({ user_id: auth.user_id, success: false, error: e?.message || 'unknown error' });
      }
    }

    const successful = results.filter(r => r.success);
    console.log(`Created ${successful.length} successful recurring transfers out of ${results.length} attempts`);

    // Step 4: Advance the test clock by 1 day to trigger first transfers
    if (plaidEnv === 'sandbox' && testClockId && successful.length > 0) {
      try {
        console.log('Step 4: Advancing test clock by 1 day to trigger first transfers...');

        // Get the current test clock time and advance by 1 day
        const currentClockResponse = await plaidClient.sandboxTransferTestClockGet({ test_clock_id: testClockId });
        const currentVirtualTime = new Date(currentClockResponse.data.test_clock.virtual_time);
        
        const advanceTime = new Date(currentVirtualTime);
        advanceTime.setDate(currentVirtualTime.getDate() + 1);
        advanceTime.setHours(23, 59, 0, 0); // End of day

        await plaidClient.sandboxTransferTestClockAdvance({
          test_clock_id: testClockId,
          new_virtual_time: advanceTime.toISOString()
        });
      } catch (advanceError) {
        console.warn('Failed to advance test clock:', advanceError);
        // Continue even if advancement fails
      }
    }

    if (successful.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to create any recurring transfers', results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Update circle status and start date
    const { error: updateError } = await svc
      .from('circles')
      .update({ status: 'active', start_date: new Date().toISOString().split('T')[0] })
      .eq('id', circle.id);
    if (updateError) {
      console.error('Failed to update circle status', updateError);
    }

    // Initialize rotation using edge function if present
    try {
      const { data, error } = await svc.functions.invoke('manage-circle-rotation', {
        body: { circleId: circle.id, action: 'initialize', adminUserId: user.id }
      });
      if (error || !data?.success) {
        console.error('Rotation initialization failed', error || data?.error);
      }
    } catch (e) {
      console.warn('Rotation initialization error', e);
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      successful_transfers: successful.length,
      failed_transfers: results.length - successful.length,
      test_clock_id: testClockId || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('start-circle error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
