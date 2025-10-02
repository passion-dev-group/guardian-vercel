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
      const { test_clock_id, virtual_time_iso, recurring_transfer_id } = body;
      if (!test_clock_id || !virtual_time_iso) {
        return new Response(JSON.stringify({ error: 'test_clock_id and virtual_time_iso are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Determine a safe advancement time: max(provided, current_clock + 1 minute), converted to PST-like ISO
        let desired = new Date(virtual_time_iso);
        try {
          const current = await plaid.sandboxTransferTestClockGet({ test_clock_id } as any);
          const currentVirtual = new Date(current.data.test_clock.virtual_time);
          const minAdvance = new Date(currentVirtual.getTime() + 60 * 1000);
          if (desired < minAdvance) desired = minAdvance;
        } catch (getErr) {
          console.warn('advance_clock: test_clock_get failed, proceeding with provided time', getErr);
        }

        // Plaid examples use PST; adjust from UTC by -8h
        const pst = new Date(desired);
        pst.setTime(pst.getTime() - 8 * 60 * 60 * 1000);
        const virtualTimeToSend = pst.toISOString();

        console.log('advance_clock request', { test_clock_id, virtualTimeToSend });

        await plaid.sandboxTransferTestClockAdvance({
          test_clock_id,
          new_virtual_time: virtualTimeToSend,
        } as any);
npx 
        console.log('Test clock advanced successfully');

        // After advancing the clock, trigger webhooks to notify backend about new transfers
        // In sandbox mode, we need to manually trigger webhook processing
        const webhookResults: any[] = [];
        
        try {
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
                try {
                  // Call the webhook handler to process this transfer
                  const webhookUrl = `${supabaseUrl}/functions/v1/plaid-transfer-webhook`;
                  
                  const webhookPayload = {
                    webhook_type: 'TRANSFER',
                    webhook_code: 'TRANSFER_EVENTS_UPDATE',
                    environment: Deno.env.get('PLAID_ENV') || 'sandbox',
                  };

                  console.log(`Triggering webhook for new transfer ${transferId}`);
                  
                  const webhookResponse = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(webhookPayload),
                  });

                  if (webhookResponse.ok) {
                    webhookResults.push({ 
                      transfer_id: transferId, 
                      status: 'webhook_sent',
                      recurring_transfer_id: recurringTransferId 
                    });
                    console.log(`Webhook sent successfully for transfer ${transferId}`);
                  } else {
                    const errorText = await webhookResponse.text();
                    console.error(`Webhook failed for transfer ${transferId}:`, errorText);
                    webhookResults.push({ 
                      transfer_id: transferId, 
                      status: 'webhook_failed',
                      error: errorText 
                    });
                  }
                } catch (webhookError: any) {
                  console.error(`Error sending webhook for transfer ${transferId}:`, webhookError);
                  webhookResults.push({ 
                    transfer_id: transferId, 
                    status: 'webhook_error',
                    error: webhookError.message 
                  });
                }
              }
            } catch (transferError: any) {
              console.error(`Error processing recurring transfer ${recurringTransferId}:`, transferError);
            }
          }
        } catch (fetchError: any) {
          console.error('Error fetching transfers and sending webhooks:', fetchError);
          // Don't fail the entire request if webhook sending fails
        }

        // Optionally check recurring transfer details
        let recurringDetails = null;
        if (recurring_transfer_id) {
          try {
            const details = await plaid.transferRecurringGet({ recurring_transfer_id });
            recurringDetails = details.data.recurring_transfer;
          } catch (checkErr) {
            console.warn('advance_clock: transferRecurringGet failed', checkErr);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          advanced: true, 
          webhooks_sent: webhookResults,
          webhook_count: webhookResults.length,
          recurring: recurringDetails,
          message: `Test clock advanced and ${webhookResults.length} webhook(s) triggered`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('advance_clock error', {
          test_clock_id,
          virtual_time_iso,
          plaid_error: err?.response?.data || err?.message || String(err)
        });
        return new Response(JSON.stringify({ 
          error: 'Failed to advance test clock',
          details: err?.response?.data || err?.message || String(err)
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
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
      await plaid.sandboxTransferSimulate({ transfer_id, event_type: status } as any);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch latest one-off transfer_id for a given recurring transfer using Plaid APIs
    if (action === 'latest_transfer_for_recurring') {
      const { recurring_transfer_id } = body;
      if (!recurring_transfer_id) {
        return new Response(JSON.stringify({ error: 'recurring_transfer_id is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        // Get the recurring transfer to obtain an account_id and status
        const recurring = await plaid.transferRecurringGet({ recurring_transfer_id } as any);
        const accountId = recurring.data.recurring_transfer.account_id;

        // List recent transfers filtered by account and recurring_transfer_id if supported
        // Plaid TransferListRequest supports count and offset; we'll fetch recent and filter client-side
        const list = await plaid.transferList({ count: 25, offset: 0 } as any);
        const transfers = (list.data.transfers || []).filter((t: any) =>
          t.recurring_transfer_id === recurring_transfer_id || t.account_id === accountId
        );

        // Sort by created_at descending to get latest
        transfers.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = transfers[0];

        if (!latest) {
          return new Response(JSON.stringify({ error: 'No matching transfers found for recurring transfer' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
        }

        return new Response(JSON.stringify({ success: true, transfer_id: latest.id || latest.transfer_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch latest transfer for recurring',
          details: err?.response?.data || err?.message || String(err)
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

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  } catch (e) {
    console.error('admin-recurring error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
