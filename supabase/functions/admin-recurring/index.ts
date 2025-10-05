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

// Helper function to send webhook notification
async function sendWebhook(supabaseUrl: string, transferId: string, recurringTransferId?: string) {
  const webhookUrl = `${supabaseUrl}/functions/v1/plaid-transfer-webhook`;
  
  const webhookPayload = {
    webhook_type: 'TRANSFER',
    webhook_code: 'TRANSFER_EVENTS_UPDATE',
    environment: Deno.env.get('PLAID_ENV') || 'sandbox',
  };

  console.log(`Triggering webhook for transfer ${transferId}`);
  
  try {
    // Use service role key for internal webhook calls
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(webhookPayload),
    });

    if (webhookResponse.ok) {
      console.log(`Webhook sent successfully for transfer ${transferId}`);
      return { 
        transfer_id: transferId, 
        status: 'webhook_sent',
        recurring_transfer_id: recurringTransferId 
      };
    } else {
      const errorText = await webhookResponse.text();
      console.error(`Webhook failed for transfer ${transferId}:`, errorText);
      return { 
        transfer_id: transferId, 
        status: 'webhook_failed',
        error: errorText 
      };
    }
  } catch (webhookError: any) {
    console.error(`Error sending webhook for transfer ${transferId}:`, webhookError);
    return { 
      transfer_id: transferId, 
      status: 'webhook_error',
      error: webhookError.message 
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const svc = createClient(supabaseUrl, serviceKey);
  const plaid = createPlaidClient();

  try {
    const body = req.method === 'GET' ? Object.fromEntries(new URL(req.url).searchParams.entries()) : await req.json();
    const action = body.action || 'list';

    // Authenticate caller
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
    // Authorize site admin
    const { data: roles, error: roleError } = await svc
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roleList = Array.isArray(roles) ? roles.map((r: any) => r.role) : [];
    const isSiteAdmin = roleList.includes('admin') || roleList.includes('site_admin');

    if (roleError || !isSiteAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: site admin only' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (action === 'list') {
      // Fetch recurring rows with non-null test_clock_id from both tables
      const [circleRes, soloRes] = await Promise.all([
        svc.from('recurring_contributions').select('*').not('test_clock_id', 'is', null),
        svc.from('solo_savings_recurring_contributions').select('*').not('test_clock_id', 'is', null),
      ]);

      if (circleRes.error) throw circleRes.error;
      if (soloRes.error) throw soloRes.error;

      const allRows: any[] = [
        ...(circleRes.data || []).map((r: any) => ({ ...r, circle_id: r.circle_id })),
        ...(soloRes.data || []).map((r: any) => ({ ...r, goal_id: r.goal_id })),
      ];

      // Fetch profiles for user display names
      const userIds = Array.from(new Set(allRows.map(r => r.user_id).filter(Boolean)));
      let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await svc
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);
        if (!profilesError && Array.isArray(profiles)) {
          for (const p of profiles) {
            profileMap[p.id] = { display_name: p.display_name || null, email: p.email || null };
          }
        }
      }

      // Fetch circle names for circle_id
      const circleIds = Array.from(new Set(allRows.map(r => r.circle_id).filter(Boolean)));
      let circleMap: Record<string, { name: string | null }> = {};
      if (circleIds.length > 0) {
        const { data: circles, error: circlesError } = await svc
          .from('circles')
          .select('id, name')
          .in('id', circleIds);
        if (!circlesError && Array.isArray(circles)) {
          for (const c of circles) {
            circleMap[c.id] = { name: c.name || null };
          }
        }
      }

      // Attach user_display_name and circle_name to rows
      const rows = allRows.map(r => ({
        ...r,
        user_display_name: profileMap[r.user_id]?.display_name || null,
        user_email: profileMap[r.user_id]?.email || null,
        circle_name: circleMap[r.circle_id]?.name || null,
        circle_id: r.circle_id || null,
      }));

      const groups: Record<string, any[]> = {};
      for (const row of rows) {
        const key = row.test_clock_id || 'unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }

      return new Response(JSON.stringify({ success: true, groups }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'advance_clock') {
      const { test_clock_id, days_to_advance, recurring_transfer_id } = body;
      if (!test_clock_id || !days_to_advance) {
        return new Response(JSON.stringify({ error: 'test_clock_id and days_to_advance are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Get current test clock time
        let current;
        try {
          current = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
        } catch (getErr: any) {
          console.error('Failed to get test clock:', getErr);
          return new Response(JSON.stringify({ 
            error: 'Invalid or expired test_clock_id',
            details: getErr?.response?.data || getErr?.message
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        const currentVirtual = new Date(current.data.test_clock.virtual_time);
        
        console.log('Current test clock time:', currentVirtual.toISOString());
        console.log('Test clock details:', {
          id: current.data.test_clock.id,
          virtual_time: current.data.test_clock.virtual_time,
        });

        // Calculate target time by adding days to current time
        // Keep the same time of day, just advance the date
        const desired = new Date(currentVirtual);
        desired.setDate(desired.getDate() + days_to_advance);

        // Ensure we advance at least 1 minute from current time
        const minAdvance = new Date(currentVirtual.getTime() + 60 * 1000);
        if (desired <= minAdvance) {
          desired.setTime(minAdvance.getTime());
        }

        // Validate that we're not advancing too far into the future (Plaid has limits)
        const maxAdvance = new Date(currentVirtual);
        maxAdvance.setFullYear(maxAdvance.getFullYear() + 1); // 1 year max
        if (desired > maxAdvance) {
          return new Response(JSON.stringify({ 
            error: 'Cannot advance more than 1 year into the future',
            current: currentVirtual.toISOString(),
            requested: desired.toISOString()
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // Validate the desired date is valid
        if (isNaN(desired.getTime())) {
          return new Response(JSON.stringify({ 
            error: 'Invalid date calculated',
            current: currentVirtual.toISOString(),
            days_to_advance: days_to_advance
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // Ensure proper RFC 3339 format for Plaid
        // Create a new date to ensure proper formatting
        const formattedDate = new Date(desired.getTime());
        const virtualTimeToSend = formattedDate.toISOString();
        
        // Additional validation to ensure the format is correct
        if (!virtualTimeToSend.includes('T') || !virtualTimeToSend.endsWith('Z')) {
          return new Response(JSON.stringify({ 
            error: 'Failed to create valid RFC 3339 datetime string',
            generated: virtualTimeToSend,
            original: desired.toISOString()
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        
        // Debug logging to check the format
        console.log('Date formatting debug:', {
          current_virtual: currentVirtual.toISOString(),
          desired_date: desired,
          desired_iso: virtualTimeToSend,
          is_valid_date: !isNaN(desired.getTime()),
          timezone_offset: desired.getTimezoneOffset()
        });

        console.log('advance_clock request', { 
          test_clock_id, 
          days_to_advance,
          current_time: currentVirtual.toISOString(),
          target_time: desired.toISOString(),
          advancement_hours: (desired.getTime() - currentVirtual.getTime()) / (1000 * 60 * 60),
          advancement_days: (desired.getTime() - currentVirtual.getTime()) / (1000 * 60 * 60 * 24)
        });

        const advanceRequest = {
          test_clock_id,
          new_virtual_time: virtualTimeToSend,
        };

        console.log('Calling sandboxTransferTestClockAdvance with:', advanceRequest);

        let advanceError = null;
        try {
          await plaid.sandboxTransferTestClockAdvance(advanceRequest as any);
          console.log('✅ Test clock advanced successfully (no errors)');
        } catch (advanceErr: any) {
          // Store the error but verify if clock actually advanced
          advanceError = advanceErr;
          console.warn('⚠️ Received error from sandboxTransferTestClockAdvance:', {
            test_clock_id,
            plaid_error: advanceErr?.response?.data || advanceErr?.message || String(advanceErr)
          });
        }

        // Verify if the clock was actually advanced by checking current time
        // This is important because Plaid sometimes returns errors even when the operation succeeds
        // Add a small delay to let Plaid's systems settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let actuallyAdvanced = false;
        try {
          const verifyResponse = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
          const newVirtualTime = new Date(verifyResponse.data.test_clock.virtual_time);
          
          // Calculate time differences in milliseconds
          const originalTimestamp = currentVirtual.getTime();
          const targetTimestamp = desired.getTime();
          const newTimestamp = newVirtualTime.getTime();
          
          const advancedFromOriginal = newTimestamp - originalTimestamp;
          const differenceFromTarget = newTimestamp - targetTimestamp;
          
          // Allow 5 minutes (300000ms) tolerance for verification
          // Plaid might not advance to the exact millisecond
          const toleranceMs = 5 * 60 * 1000; 
          
          console.log('Verification check:', {
            original_time: currentVirtual.toISOString(),
            target_time: desired.toISOString(),
            actual_new_time: newVirtualTime.toISOString(),
            advanced_from_original_ms: advancedFromOriginal,
            difference_from_target_ms: differenceFromTarget,
            within_tolerance: Math.abs(differenceFromTarget) <= toleranceMs || newTimestamp >= targetTimestamp
          });

          // Check if the clock advanced:
          // 1. New time is greater than original time (it did advance)
          // 2. New time is close to or past the target time (within tolerance)
          const clockAdvanced = newTimestamp > originalTimestamp;
          const reachedTarget = newTimestamp >= (targetTimestamp - toleranceMs);
          
          if (clockAdvanced && reachedTarget) {
            actuallyAdvanced = true;
            console.log('✅ Verified: Test clock was successfully advanced', {
              advanced_by_ms: advancedFromOriginal,
              advanced_by_days: (advancedFromOriginal / (1000 * 60 * 60 * 24)).toFixed(2)
            });
          } else {
            console.error('❌ Verification failed:', {
              clock_advanced: clockAdvanced,
              reached_target: reachedTarget,
              advanced_from_original_ms: advancedFromOriginal,
              difference_from_target_ms: differenceFromTarget
            });
          }
        } catch (verifyErr: any) {
          console.error('❌ Could not verify clock advancement:', verifyErr);
        }

        // If clock didn't actually advance, return error with details
        if (!actuallyAdvanced) {
          // Try to get the actual times for better error reporting
          let errorDetails: any = {
            test_clock_id,
            days_to_advance,
            plaid_error: advanceError?.response?.data || advanceError?.message || null
          };
          
          try {
            const currentCheck = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
            const currentTime = new Date(currentCheck.data.test_clock.virtual_time);
            errorDetails.original_time = currentVirtual.toISOString();
            errorDetails.target_time = desired.toISOString();
            errorDetails.actual_current_time = currentTime.toISOString();
            errorDetails.time_difference_hours = ((currentTime.getTime() - currentVirtual.getTime()) / (1000 * 60 * 60)).toFixed(2);
          } catch (e) {
            // Ignore errors in error reporting
          }
          
          console.error('❌ Failed to advance test clock:', errorDetails);
          
          return new Response(JSON.stringify({ 
            error: 'Failed to advance test clock',
            details: errorDetails,
            verified: false
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // Clock was advanced successfully (even if there was an error response)
        if (advanceError) {
          console.log('✅ Test clock advanced successfully (despite error response)');
        }

      } catch (criticalErr: any) {
        // This catches any critical errors during verification
        console.error('❌ Critical error in advance_clock:', {
          test_clock_id,
          days_to_advance,
          error: criticalErr?.message || String(criticalErr)
        });
        return new Response(JSON.stringify({ 
          error: 'Critical error advancing test clock',
          details: criticalErr?.message || String(criticalErr)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }

      // Clock advanced successfully - now trigger webhooks (non-critical)
      const webhookResults: any[] = [];
      const webhookErrors: any[] = [];
      
      try {
        console.log('📨 Starting webhook processing...');
        
        // Get all recurring transfers associated with this test clock
        const [circleRecurring, soloRecurring] = await Promise.all([
          svc.from('recurring_contributions').select('*').eq('test_clock_id', test_clock_id),
          svc.from('solo_savings_recurring_contributions').select('*').eq('test_clock_id', test_clock_id),
        ]);

        const allRecurringTransfers: any[] = [
          ...(circleRecurring.data || []),
          ...(soloRecurring.data || []),
        ];

        console.log(`Found ${allRecurringTransfers.length} recurring transfers for test_clock_id: ${test_clock_id}`);

        // For each recurring transfer, get transfer IDs and trigger webhooks
        for (const recurringRecord of allRecurringTransfers) {
          const recurringTransferId = recurringRecord.plaid_recurring_transfer_id;
          
          try {
            // Get recurring transfer details which includes transfer_ids field
            const recurringDetails = await plaid.transferRecurringGet({ recurring_transfer_id: recurringTransferId } as any);
            const transferIds = recurringDetails.data.recurring_transfer.transfer_ids || [];

            console.log(`Found ${transferIds.length} transfer IDs for recurring_transfer_id: ${recurringTransferId}`);

            // Check which transfers are new (don't exist in database yet)
            const isCircle = recurringRecord.circle_id !== undefined;
            const newTransferIds: string[] = [];

            for (const transferId of transferIds) {
              let exists = false;
              
              if (isCircle) {
                const { data } = await svc
                  .from('circle_transactions')
                  .select('id')
                  .eq('plaid_transfer_id', transferId)
                  .maybeSingle();
                exists = !!data;
              } else {
                const { data } = await svc
                  .from('solo_savings_transactions')
                  .select('id')
                  .eq('plaid_transfer_id', transferId)
                  .maybeSingle();
                exists = !!data;
              }

              if (!exists) {
                newTransferIds.push(transferId);
                console.log(`Transfer ${transferId} is new, will send webhook`);
              } else {
                console.log(`Transfer ${transferId} already exists, skipping webhook`);
              }
            }

            console.log(`${newTransferIds.length} new transfers found out of ${transferIds.length} total`);

            // Only send webhooks for new transfers
            for (const transferId of newTransferIds) {
              const result = await sendWebhook(supabaseUrl, transferId, recurringTransferId);
              webhookResults.push(result);
            }
          } catch (transferError: any) {
            console.error(`❌ Error processing recurring transfer ${recurringTransferId}:`, transferError);
            webhookErrors.push({
              recurring_transfer_id: recurringTransferId,
              error: transferError?.message || String(transferError)
            });
          }
        }
      } catch (fetchError: any) {
        console.error('❌ Error fetching transfers and sending webhooks:', fetchError);
        webhookErrors.push({
          type: 'fetch_error',
          error: fetchError?.message || String(fetchError)
        });
      }

      // Optionally check recurring transfer details
      let recurringDetails = null;
      if (recurring_transfer_id) {
        try {
          const details = await plaid.transferRecurringGet({ recurring_transfer_id });
          recurringDetails = details.data.recurring_transfer;
        } catch (checkErr) {
          console.warn('⚠️ advance_clock: transferRecurringGet failed', checkErr);
        }
      }

      console.log('✅ Webhook processing complete');

      return new Response(JSON.stringify({ 
        success: true, 
        advanced: true, 
        days_advanced: days_to_advance,
        webhooks_sent: webhookResults,
        webhook_count: webhookResults.length,
        webhook_errors: webhookErrors.length > 0 ? webhookErrors : undefined,
        recurring: recurringDetails,
        message: `Test clock advanced by ${days_to_advance} day(s) and ${webhookResults.length} webhook(s) triggered${webhookErrors.length > 0 ? ` (${webhookErrors.length} errors)` : ''}`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'simulate_status') {
      const { transfer_id, status } = body;
      if (!transfer_id || !status) {
        return new Response(JSON.stringify({ error: 'transfer_id and status are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
      // Valid Plaid transfer status lifecycle per docs: pending, posted, settled, funds_available, failed, returned, cancelled
      // Ref: https://plaid.com/docs/transfer/reconciling-transfers/
      const allowed: string[] = ['pending', 'posted', 'settled', 'funds_available', 'failed', 'returned', 'cancelled'];
      if (!allowed.includes(status)) {
        return new Response(JSON.stringify({ error: `Invalid status '${status}'. Allowed: ${allowed.join(', ')}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Simulate the status change in Plaid
        await plaid.sandboxTransferSimulate({ transfer_id, event_type: status } as any);
        console.log(`Simulated status '${status}' for transfer ${transfer_id}`);

        // Trigger webhook to update database
        const webhookResult = await sendWebhook(supabaseUrl, transfer_id);

        return new Response(JSON.stringify({ 
          success: true,
          simulated: true,
          transfer_id,
          status,
          webhook_status: webhookResult.status,
          webhook_error: webhookResult.error || null,
          message: `Status '${status}' simulated and webhook ${webhookResult.status}`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('simulate_status error', err);
        return new Response(JSON.stringify({ 
          error: 'Failed to simulate status or send webhook',
          details: err?.response?.data || err?.message || String(err)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    // Fetch latest transfer for a given recurring transfer from database
    if (action === 'latest_transfer_for_recurring') {
      const { recurring_transfer_id } = body;
      if (!recurring_transfer_id) {
        return new Response(JSON.stringify({ error: 'recurring_transfer_id is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Search in both circle_transactions and solo_savings_transactions
        // Circle transactions store recurring_transfer_id in metadata
        const { data: circleTransfers, error: circleError } = await svc
          .from('circle_transactions')
          .select('plaid_transfer_id, created_at, status, amount')
          .eq('metadata->>recurring_transfer_id', recurring_transfer_id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Solo savings transactions also store recurring_transfer_id in metadata
        const { data: soloTransfers, error: soloError } = await svc
          .from('solo_savings_transactions')
          .select('plaid_transfer_id, created_at, status, amount')
          .eq('metadata->>recurring_transfer_id', recurring_transfer_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (circleError && soloError) {
          throw new Error(`Database errors: ${circleError?.message}, ${soloError?.message}`);
        }

        // Combine results and find the most recent
        const allTransfers = [
          ...(circleTransfers || []).map(t => ({ ...t, type: 'circle' })),
          ...(soloTransfers || []).map(t => ({ ...t, type: 'solo_savings' })),
        ];

        if (allTransfers.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'No transfers found for recurring transfer in database' 
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
        }

        // Sort by created_at descending and get the latest
        allTransfers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = allTransfers[0];

        return new Response(JSON.stringify({ 
          success: true, 
          transfer_id: latest.plaid_transfer_id,
          status: latest.status,
          amount: latest.amount,
          created_at: latest.created_at,
          type: latest.type,
          total_transfers: allTransfers.length
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch latest transfer for recurring',
          details: err?.message || String(err)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    if (action === 'get_clock_time') {
      const { test_clock_id } = body;
      if (!test_clock_id) {
        return new Response(JSON.stringify({ error: 'test_clock_id is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        const current = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
        const currentVirtual = new Date(current.data.test_clock.virtual_time);
        
        return new Response(JSON.stringify({ 
          success: true, 
          virtual_time: currentVirtual.toISOString(),
          test_clock: current.data.test_clock
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('get_clock_time error', {
          test_clock_id,
          plaid_error: err?.response?.data || err?.message || String(err)
        });
        return new Response(JSON.stringify({ 
          error: 'Failed to get test clock time',
          details: err?.response?.data || err?.message || String(err)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    // New action to check recurring transfer and test clock health
    if (action === 'check_health') {
      const { test_clock_id, recurring_transfer_id } = body;
      
      const health: any = {
        test_clock: null,
        recurring_transfer: null,
        errors: []
      };

      // Check test clock
      if (test_clock_id) {
        try {
          const clockRes = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
          health.test_clock = {
            id: clockRes.data.test_clock.id,
            virtual_time: clockRes.data.test_clock.virtual_time,
            status: 'valid'
          };
        } catch (err: any) {
          health.errors.push({
            type: 'test_clock',
            error: err?.response?.data || err?.message
          });
        }
      }

      // Check recurring transfer
      if (recurring_transfer_id) {
        try {
          const recurringRes = await plaid.transferRecurringGet({ recurring_transfer_id } as any);
          health.recurring_transfer = {
            id: recurringRes.data.recurring_transfer.recurring_transfer_id,
            status: recurringRes.data.recurring_transfer.status,
            amount: recurringRes.data.recurring_transfer.amount,
            test_clock_id: recurringRes.data.recurring_transfer.test_clock_id,
            transfer_ids: recurringRes.data.recurring_transfer.transfer_ids?.length || 0,
            next_origination_date: recurringRes.data.recurring_transfer.next_origination_date
          };
        } catch (err: any) {
          health.errors.push({
            type: 'recurring_transfer',
            error: err?.response?.data || err?.message
          });
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        health
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Set contributed - mark all transfer items in current cycle as settled in Plaid and completed in database
    if (action === 'set_contributed') {
      const { circle_id } = body;
      if (!circle_id) {
        return new Response(JSON.stringify({ error: 'circle_id is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Get circle information
        const { data: circle, error: circleError } = await svc
          .from('circles')
          .select('id, name, frequency, status, created_at')
          .eq('id', circle_id)
          .single();

        if (circleError || !circle) {
          return new Response(JSON.stringify({ error: 'Circle not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
        }

        // Calculate cycle start date
        // Find the most recent payout transaction to determine cycle start
        const { data: lastPayout, error: payoutError } = await svc
          .from('circle_transactions')
          .select('transaction_date, created_at')
          .eq('circle_id', circle_id)
          .eq('type', 'payout')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let cycleStartDate: string;
        if (lastPayout) {
          // Cycle starts after the last payout
          cycleStartDate = lastPayout.created_at;
        } else {
          // No previous payout, cycle starts from circle creation
          cycleStartDate = circle.created_at;
        }

        // Current time is the cycle end (we're in the current cycle)
        const cycleEndDate = new Date().toISOString();

        console.log(`Setting contributed for circle ${circle_id}`);
        console.log(`Cycle period: ${cycleStartDate} to ${cycleEndDate}`);

        // Get all transfer items (transactions) for this circle in the current cycle
        const { data: transactions, error: transactionsError } = await svc
          .from('circle_transactions')
          .select('id, plaid_transfer_id, status, amount, type, created_at, transaction_date')
          .eq('circle_id', circle_id)
          .eq('type', 'contribution')
          .gte('created_at', cycleStartDate)
          .lte('created_at', cycleEndDate)
          .not('plaid_transfer_id', 'is', null);

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
          return new Response(JSON.stringify({ error: 'Error fetching transactions' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

        if (!transactions || transactions.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No transfer items found in current cycle',
            updated_count: 0,
            cycle_start: cycleStartDate,
            cycle_end: cycleEndDate
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log(`Found ${transactions.length} transfer items in current cycle`);

        // Step 1: Set status to "settled" in Plaid for all transfer items
        // First, get current status of each transfer from Plaid
        const plaidResults: any[] = [];
        for (const transaction of transactions) {
          try {
            console.log(`Getting current status for transfer ${transaction.plaid_transfer_id}`);
            
            // Get current transfer status from Plaid
            const transferDetails = await plaid.transferGet({ 
              transfer_id: transaction.plaid_transfer_id 
            } as any);
            
            const currentStatus = transferDetails.data.transfer.status;
            console.log(`Current status for transfer ${transaction.plaid_transfer_id}: ${currentStatus}`);
            
            // Simulate proper status progression
            if (currentStatus === 'pending') {
              // First simulate "posted" status
              console.log(`Simulating posted status for transfer ${transaction.plaid_transfer_id}`);
              await plaid.sandboxTransferSimulate({ 
                transfer_id: transaction.plaid_transfer_id, 
                event_type: 'posted' 
              } as any);
              
              // Wait a moment for the status to update
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Then simulate "settled" status
              console.log(`Simulating settled status for transfer ${transaction.plaid_transfer_id}`);
              await plaid.sandboxTransferSimulate({ 
                transfer_id: transaction.plaid_transfer_id, 
                event_type: 'settled' 
              } as any);
              
            } else if (currentStatus === 'posted') {
              // Can directly simulate "settled" status
              console.log(`Simulating settled status for transfer ${transaction.plaid_transfer_id}`);
              await plaid.sandboxTransferSimulate({ 
                transfer_id: transaction.plaid_transfer_id, 
                event_type: 'settled' 
              } as any);
              
            } else if (currentStatus === 'settled') {
              // Already settled, no action needed
              console.log(`Transfer ${transaction.plaid_transfer_id} is already settled`);
              
            } else {
              // Other statuses (failed, returned, cancelled) - can't be settled
              console.log(`Transfer ${transaction.plaid_transfer_id} has status ${currentStatus}, cannot be settled`);
              plaidResults.push({
                id: transaction.id,
                plaid_transfer_id: transaction.plaid_transfer_id,
                plaid_success: false,
                plaid_error: `Transfer has status ${currentStatus}, cannot be settled`
              });
              continue;
            }
            
            plaidResults.push({
              id: transaction.id,
              plaid_transfer_id: transaction.plaid_transfer_id,
              plaid_success: true,
              current_status: currentStatus,
              final_status: 'settled'
            });
            console.log(`✅ Plaid status progression completed for transfer ${transaction.plaid_transfer_id}`);
            
          } catch (plaidError: any) {
            console.error(`❌ Failed to process transfer ${transaction.plaid_transfer_id}:`, plaidError);
            plaidResults.push({
              id: transaction.id,
              plaid_transfer_id: transaction.plaid_transfer_id,
              plaid_success: false,
              plaid_error: plaidError?.response?.data || plaidError?.message
            });
          }
        }

        // Step 2: Update status to "completed" in circle_transactions table
        const dbResults: any[] = [];
        for (const transaction of transactions) {
          const { data: updated, error: updateError } = await svc
            .from('circle_transactions')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id)
            .select()
            .single();

          if (updateError) {
            console.error(`Error updating transaction ${transaction.id}:`, updateError);
            dbResults.push({
              id: transaction.id,
              plaid_transfer_id: transaction.plaid_transfer_id,
              db_success: false,
              db_error: updateError.message
            });
          } else {
            console.log(`Updated transaction ${transaction.id} to completed in database`);
            dbResults.push({
              id: transaction.id,
              plaid_transfer_id: transaction.plaid_transfer_id,
              db_success: true,
              old_status: transaction.status,
              new_status: 'completed'
            });
          }
        }

        // Combine results
        const combinedResults = transactions.map(transaction => {
          const plaidResult = plaidResults.find(r => r.id === transaction.id);
          const dbResult = dbResults.find(r => r.id === transaction.id);
          
          return {
            id: transaction.id,
            plaid_transfer_id: transaction.plaid_transfer_id,
            plaid_success: plaidResult?.plaid_success || false,
            db_success: dbResult?.db_success || false,
            plaid_error: plaidResult?.plaid_error,
            db_error: dbResult?.db_error,
            old_status: transaction.status,
            new_status: 'completed'
          };
        });

        const plaidSuccessCount = plaidResults.filter((r: any) => r.plaid_success).length;
        const dbSuccessCount = dbResults.filter((r: any) => r.db_success).length;
        const totalSuccessCount = combinedResults.filter((r: any) => r.plaid_success && r.db_success).length;

        // Step 3: Send webhook to Plaid after all transfers are processed
        let webhookResult = null;
        if (totalSuccessCount > 0) {
          try {
            console.log(`Sending webhook for ${totalSuccessCount} successfully processed transfers`);
            // Use the first successful transfer ID for the webhook
            const firstSuccessfulTransfer = combinedResults.find((r: any) => r.plaid_success && r.db_success);
            if (firstSuccessfulTransfer) {
              webhookResult = await sendWebhook(supabaseUrl, firstSuccessfulTransfer.plaid_transfer_id);
              console.log(`Webhook sent successfully: ${webhookResult.status}`);
            }
          } catch (webhookError: any) {
            console.error('Error sending webhook:', webhookError);
            webhookResult = {
              status: 'webhook_error',
              error: webhookError.message
            };
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: `Processed ${transactions.length} transfer items: ${plaidSuccessCount} Plaid updates, ${dbSuccessCount} database updates, ${totalSuccessCount} fully successful`,
          plaid_updated: plaidSuccessCount,
          db_updated: dbSuccessCount,
          fully_successful: totalSuccessCount,
          total_found: transactions.length,
          cycle_start: cycleStartDate,
          cycle_end: cycleEndDate,
          webhook_result: webhookResult,
          results: combinedResults
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('set_contributed error', err);
        return new Response(JSON.stringify({ 
          error: 'Failed to set contributed',
          details: err?.message || String(err)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  } catch (e) {
    console.error('admin-recurring error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
