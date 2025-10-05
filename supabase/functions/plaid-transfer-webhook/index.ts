import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Payment collection configuration
const PAYMENT_CONFIG = {
  // Collection threshold: minimum percentage of members who must contribute before payout
  COLLECTION_THRESHOLD_PERCENT: 80, // 80% of active members must contribute
}

interface PlaidTransferWebhook {
  webhook_type: 'TRANSFER'
  webhook_code: 'TRANSFER_EVENTS_UPDATE'
  timestamp: string
  environment: 'sandbox' | 'production'
}

interface PlaidAccountWebhook {
  webhook_type: 'ACCOUNTS'
  webhook_code: 'ACCOUNT_UPDATED' | 'ACCOUNT_BALANCE_UPDATED'
  item_id: string
  account_id: string
  timestamp: string
}

interface PlaidTransactionsWebhook {
  webhook_type: 'TRANSACTIONS'
  webhook_code: 'SYNC_UPDATES_AVAILABLE' | 'DEFAULT_UPDATE' | 'INITIAL_UPDATE' | 'HISTORICAL_UPDATE' | 'RECURRING_TRANSACTIONS_UPDATE' | 'TRANSACTIONS_REMOVED'
  item_id: string
  new_transactions?: number
  removed_transactions?: string[]
  timestamp: string
  environment?: 'sandbox' | 'production'
}

type PlaidWebhook = PlaidTransferWebhook | PlaidAccountWebhook | PlaidTransactionsWebhook

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Add a simple test endpoint
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        message: 'Plaid webhook function is working',
        timestamp: new Date().toISOString(),
        method: req.method,
        headers: Object.fromEntries(req.headers.entries())
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }

  // Handle POST requests (webhooks)
  if (req.method === 'POST') {
    try {
      // Get the webhook payload
      const webhookData: PlaidWebhook = await req.json()
      
      console.log('Received Plaid webhook:', webhookData)

      // Handle different webhook types
      if (webhookData.webhook_type === 'TRANSFER') {
        await handleTransferWebhook(webhookData as PlaidTransferWebhook)
      } else if (webhookData.webhook_type === 'ACCOUNTS') {
        await handleAccountWebhook(webhookData as PlaidAccountWebhook)
      } else if (webhookData.webhook_type === 'TRANSACTIONS') {
        await handleTransactionsWebhook(webhookData as PlaidTransactionsWebhook)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          webhook_type: webhookData.webhook_type,
          webhook_code: webhookData.webhook_code,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } catch (error) {
      console.error('Error processing Plaid webhook:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to process webhook' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
  )
})

async function handleTransferWebhook(webhookData: PlaidTransferWebhook) {
  try {
    console.log(`🔔 Step 1: Wake-up signal received - ${webhookData.webhook_code}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Initialize Plaid client
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')!
    const plaidSecret = Deno.env.get('PLAID_SECRET')!
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'
    
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': plaidClientId,
          'PLAID-SECRET': plaidSecret,
        },
      },
    })
    const client = new PlaidApi(configuration)

    // Step 2: Pull the facts - sync transfer events
    console.log('📥 Step 2: Pulling facts from /transfer/event/sync...')
    
    // Get the last processed event_id from our database (check both tables)
    const [circleLastEvent, soloLastEvent] = await Promise.all([
      supabase
        .from('circle_transactions')
        .select('metadata->plaid_event_id')
        .not('metadata->plaid_event_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('solo_savings_transactions')
        .select('metadata->plaid_event_id')
        .not('metadata->plaid_event_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);
    
    let afterId = 0 // Default to start from beginning
    const circleEventId = circleLastEvent?.data?.metadata?.plaid_event_id;
    const soloEventId = soloLastEvent?.data?.metadata?.plaid_event_id;
    
    if (circleEventId || soloEventId) {
      afterId = Math.max(
        circleEventId ? parseInt(circleEventId.toString(), 10) : 0,
        soloEventId ? parseInt(soloEventId.toString(), 10) : 0
      );
      console.log(`Syncing events after event_id: ${afterId}`)
    } else {
      console.log('No previous events found, syncing from beginning')
    }
    
    const syncResponse = await client.transferEventSync({
      after_id: afterId
    })
    
    if (!syncResponse.data.transfer_events || syncResponse.data.transfer_events.length === 0) {
      console.log('No new transfer events to process')
      return
    }

    const allEvents = syncResponse.data.transfer_events;
    console.log(`📊 Received ${allEvents.length} transfer events`)

    // Save the highest event_id for next sync
    const highestEventId = Math.max(...allEvents.map(e => e.event_id));
    console.log(`💾 Highest event_id: ${highestEventId}`)

    // Step 3: Identify "today's contributions" - filter to new origination events
    console.log('🔍 Step 3: Identifying new origination events...')
    
    // Group events by transfer_id to find first event for each transfer
    const transferEventsMap = new Map<string, any[]>();
    for (const event of allEvents) {
      const transferId = event.transfer_id;
      if (!transferEventsMap.has(transferId)) {
        transferEventsMap.set(transferId, []);
      }
      transferEventsMap.get(transferId)!.push(event);
    }

    const newOriginationEvents: any[] = [];
    
    for (const [transferId, events] of transferEventsMap.entries()) {
      // Sort events by event_id to get chronological order
      events.sort((a, b) => a.event_id - b.event_id);
      
      // Check if this is a new transfer (not in database yet)
      const [circleExists, soloExists] = await Promise.all([
        supabase
          .from('circle_transactions')
          .select('id')
          .eq('plaid_transfer_id', transferId)
          .maybeSingle(),
        supabase
          .from('solo_savings_transactions')
          .select('id')
          .eq('plaid_transfer_id', transferId)
          .maybeSingle()
      ]);

      const existsInDb = circleExists.data || soloExists.data;

      if (!existsInDb) {
        // This is a new transfer - find the first pending or posted event
        const originationEvent = events.find(e => 
          e.event_type === 'pending' || e.event_type === 'posted'
        );
        
        if (originationEvent) {
          newOriginationEvents.push(originationEvent);
          console.log(`✨ New transfer detected: ${transferId} (${originationEvent.event_type})`);
        }
      } else {
        // Existing transfer - process all status update events
        for (const event of events) {
          await processTransferEvent(supabase, event);
        }
      }
    }

    console.log(`🆕 Found ${newOriginationEvents.length} new origination events`);

    // Step 4: Map to recurring schedule & Step 5: Count & attribute
    console.log('🔗 Step 4 & 5: Mapping to recurring schedules and creating transactions...')
    
    const recurringStats = new Map<string, number>();

    for (const event of newOriginationEvents) {
      try {
        // Fetch transfer details to get full context
        const transferResponse = await client.transferGet({ transfer_id: event.transfer_id });
        const transfer = transferResponse.data.transfer;
        
        console.log(`📄 Transfer details for ${event.transfer_id}:`, {
          amount: transfer.amount,
          status: transfer.status,
          recurring_transfer_id: transfer.recurring_transfer_id,
          created: transfer.created
        });

        const recurringTransferId = transfer.recurring_transfer_id;

        if (!recurringTransferId) {
          console.log(`⚠️ Transfer ${event.transfer_id} is not linked to a recurring schedule, skipping`);
          continue;
        }

        // Count this contribution
        recurringStats.set(
          recurringTransferId, 
          (recurringStats.get(recurringTransferId) || 0) + 1
        );

        // Find the recurring contribution in our database
        const [circleRecurring, soloRecurring] = await Promise.all([
          supabase
            .from('recurring_contributions')
            .select('*')
            .eq('plaid_recurring_transfer_id', recurringTransferId)
            .maybeSingle(),
          supabase
            .from('solo_savings_recurring_contributions')
            .select('*')
            .eq('plaid_recurring_transfer_id', recurringTransferId)
            .maybeSingle()
        ]);

        const recurringRecord = circleRecurring.data || soloRecurring.data;
        const isCircle = !!circleRecurring.data;

        if (!recurringRecord) {
          console.log(`⚠️ No recurring contribution found for ${recurringTransferId}`);
          continue;
        }

        // Create transaction record
        const transactionData: any = {
          user_id: recurringRecord.user_id,
          amount: transfer.amount,
          status: transfer.status || 'pending',
          transaction_date: transfer.created || new Date().toISOString(),
          description: `Recurring contribution`,
          metadata: {
            recurring_transfer_id: recurringTransferId,
            plaid_transfer_id: event.transfer_id,
            plaid_authorization_id: transfer.authorization_id,
            plaid_event_id: event.event_id,
            transfer_type: 'recurring_contribution',
            event_type: event.event_type,
            webhook_timestamp: event.timestamp,
          }
        };

        if (isCircle) {
          transactionData.circle_id = recurringRecord.circle_id;
          transactionData.type = 'contribution';
          transactionData.plaid_transfer_id = event.transfer_id;
          transactionData.plaid_authorization_id = transfer.authorization_id;

          const { data: newTransaction, error } = await supabase
            .from('circle_transactions')
            .insert(transactionData)
            .select()
            .single();

          if (error) {
            console.error(`❌ Error creating circle transaction:`, error);
          } else {
            console.log(`✅ Created circle transaction ${newTransaction.id} for transfer ${event.transfer_id}`);
          }
        } else {
          transactionData.goal_id = recurringRecord.goal_id;
          transactionData.type = 'recurring_contribution';
          transactionData.plaid_transfer_id = event.transfer_id;
          transactionData.plaid_authorization_id = transfer.authorization_id;

          const { data: newTransaction, error } = await supabase
            .from('solo_savings_transactions')
            .insert(transactionData)
            .select()
            .single();

          if (error) {
            console.error(`❌ Error creating solo savings transaction:`, error);
          } else {
            console.log(`✅ Created solo savings transaction ${newTransaction.id} for transfer ${event.transfer_id}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing new transfer ${event.transfer_id}:`, err);
      }
    }

    // Log final statistics
    console.log('\n📊 Summary:');
    console.log(`Total events processed: ${allEvents.length}`);
    console.log(`New transfers created: ${newOriginationEvents.length}`);
    console.log('\nContributions by recurring schedule:');
    for (const [recurringId, count] of recurringStats.entries()) {
      console.log(`  ${recurringId} → ${count} contribution(s)`);
    }

  } catch (error) {
    console.error('Error handling transfer webhook:', error)
  }
}

async function processTransferEvent(supabase: any, event: any) {
  try {
    const { transfer_id, event_type, failure_reason, timestamp, event_id } = event
    console.log(`Processing transfer event: ${transfer_id}, type: ${event_type}, event_id: ${event_id}`)
    console.log('Full event object:', JSON.stringify(event, null, 2))

    // Find the transaction record that matches this transfer (check both tables)
    const [circleResult, soloResult] = await Promise.all([
      supabase
        .from('circle_transactions')
        .select('*')
        .eq('plaid_transfer_id', transfer_id)
        .maybeSingle(),
      supabase
        .from('solo_savings_transactions')
        .select('*')
        .eq('plaid_transfer_id', transfer_id)
        .maybeSingle()
    ]);

    let transactionToUpdate = circleResult.data || soloResult.data;
    const isCircle = !!circleResult.data;

    // If no existing transaction found, this might be from a recurring transfer
    if (!transactionToUpdate) {
      console.log(`No existing transaction found for transfer ${transfer_id}, checking if it's from a recurring transfer`)
      
      // Get transfer details from Plaid to find recurring_transfer_id
      const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')!
      const plaidSecret = Deno.env.get('PLAID_SECRET')!
      const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'
      
      const configuration = new Configuration({
        basePath: PlaidEnvironments[plaidEnv],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': plaidClientId,
            'PLAID-SECRET': plaidSecret,
          },
        },
      })
      const plaidClient = new PlaidApi(configuration)

      try {
        // Get transfer details to find recurring_transfer_id
        const transferResponse = await plaidClient.transferGet({
          transfer_id: transfer_id
        })
        
        const transfer = transferResponse.data.transfer
        const recurringTransferId = transfer.recurring_transfer_id

        if (recurringTransferId) {
          console.log(`Found recurring transfer ${recurringTransferId} for transfer ${transfer_id}`)
          
          // Find the recurring contribution record
          const { data: recurringContribution, error: recurringError } = await supabase
            .from('recurring_contributions')
            .select('*')
            .eq('plaid_recurring_transfer_id', recurringTransferId)
            .single()

          if (recurringContribution && !recurringError) {
            console.log(`Found recurring contribution for circle ${recurringContribution.circle_id}`)
            
            // Create a new circle_transactions record for this individual transfer
            const { data: newTransaction, error: createError } = await supabase
              .from('circle_transactions')
              .insert({
                circle_id: recurringContribution.circle_id,
                user_id: recurringContribution.user_id,
                amount: recurringContribution.amount,
                type: 'contribution',
                status: 'processing', // Will be updated based on event_type
                transaction_date: new Date().toISOString(),
                description: `Recurring contribution to circle`,
                plaid_transfer_id: transfer_id,
                plaid_authorization_id: transfer.authorization_id,
                metadata: {
                  recurring_transfer_id: recurringTransferId,
                  transfer_type: 'recurring_contribution',
                  created_from_webhook: true,
                  webhook_event_id: event_id
                }
              })
              .select()
              .single()

            if (createError) {
              console.error(`Error creating transaction record for recurring transfer:`, createError)
              return
            }

            transactionToUpdate = newTransaction
            console.log(`Created new transaction ${newTransaction.id} for recurring transfer ${transfer_id}`)
          } else {
            console.error(`No recurring contribution found for recurring transfer ${recurringTransferId}`)
            return
          }
        } else {
          console.error(`No recurring transfer ID found for transfer ${transfer_id}`)
          return
        }
      } catch (plaidError) {
        console.error(`Error getting transfer details from Plaid:`, plaidError)
        return
      }
    }

    if (!transactionToUpdate) {
      console.error(`No transaction to update for transfer ${transfer_id}`)
      return
    }

    console.log(`Found transaction ${transactionToUpdate.id} for transfer ${transfer_id}`)

    // Update transaction status based on Plaid event type
    let newStatus: string
    let metadata: any = {
      ...transactionToUpdate.metadata, // Preserve existing metadata
      event_type: event_type,
      last_webhook_update: new Date().toISOString(),
      event_timestamp: timestamp,
      plaid_event_id: event_id, // Store the event_id to track processed events
      event_data: event
    }

    // Handle both old and new event type formats
    const normalizedEventType = event_type?.replace('transfer.', '') || event_type
    
    switch (normalizedEventType) {
      case 'posted':
      case 'settled':
        newStatus = 'completed'
        break
      case 'failed':
        newStatus = 'failed'
        if (failure_reason) {
          metadata.failure_reason = failure_reason
        }
        break
      case 'cancelled':
        newStatus = 'cancelled'
        break
      case 'returned':
        newStatus = 'failed'
        if (failure_reason) {
          metadata.failure_reason = failure_reason
        }
        break
      case 'pending':
        newStatus = 'processing'
        break
      default:
        console.log(`Unknown event type: ${event_type} (normalized: ${normalizedEventType}), keeping current status`)
        console.log('Available event properties:', Object.keys(event))
        return
    }

    // Update the transaction in the appropriate table
    const tableName = isCircle ? 'circle_transactions' : 'solo_savings_transactions';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        metadata: metadata
      })
      .eq('id', transactionToUpdate.id)

    if (updateError) {
      console.error(`Error updating ${tableName}:`, updateError)
      return
    }

    console.log(`Transaction ${transactionToUpdate.id} updated to status: ${newStatus}`)

    // If solo savings transaction completed, update goal's current_amount
    if (!isCircle && newStatus === 'completed') {
      const { data: goal, error: goalError } = await supabase
        .from('solo_savings_goals')
        .select('current_amount')
        .eq('id', transactionToUpdate.goal_id)
        .single();

      if (!goalError && goal) {
        const { error: updateGoalError } = await supabase
          .from('solo_savings_goals')
          .update({
            current_amount: goal.current_amount + transactionToUpdate.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionToUpdate.goal_id);

        if (updateGoalError) {
          console.error('Error updating goal current_amount:', updateGoalError);
        } else {
          console.log(`✅ Updated goal ${transactionToUpdate.goal_id} current_amount by +$${transactionToUpdate.amount}`);
        }
      }
    }

    // Handle special cases
    if (transactionToUpdate.type === 'payout' && normalizedEventType === 'failed') {
      console.log(`Payout failed for transaction ${transactionToUpdate.id}, amount: ${transactionToUpdate.amount}`)
      // Add any special handling for failed payouts here
    }

    if (transactionToUpdate.type === 'contribution' && normalizedEventType === 'failed') {
      console.log(`Contribution failed for transaction ${transactionToUpdate.id}, amount: ${transactionToUpdate.amount}`)
      // Add any special handling for failed contributions here
    }

    if (normalizedEventType === 'posted') {
      console.log(`Transfer successful for transaction ${transactionToUpdate.id}`)
      
      // If this is a contribution that was posted, check collection threshold
      if (transactionToUpdate.type === 'contribution') {
        console.log(`Contribution posted for circle ${transactionToUpdate.circle_id}, checking collection threshold`)
        await checkCollectionThreshold(supabase, transactionToUpdate.circle_id, transactionToUpdate)
      }
    }

  } catch (error) {
    console.error('Error processing transfer event:', error)
  }
}

async function handleAccountWebhook(webhookData: PlaidAccountWebhook) {
  try {
    const { webhook_code, item_id, account_id } = webhookData
    console.log(`Processing account webhook: ${webhook_code} for item ${item_id}, account ${account_id}`)
    
    // Handle account balance updates
    if (webhook_code === 'ACCOUNT_BALANCE_UPDATED') {
      console.log(`Account balance updated for account ${account_id}`)
      // You can implement logic here to update cached balance information
    }
    
    // Handle account updates
    if (webhook_code === 'ACCOUNT_UPDATED') {
      console.log(`Account updated for account ${account_id}`)
      // You can implement logic here to refresh account information
    }
    
  } catch (error) {
    console.error('Error handling account webhook:', error)
  }
}

async function handleTransactionsWebhook(webhookData: PlaidTransactionsWebhook) {
  try {
    const { webhook_code, item_id } = webhookData
    console.log(`Processing transactions webhook: ${webhook_code} for item ${item_id}`)
    
    switch (webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE': {
        console.log(`New transactions available for item ${item_id}`)
        
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        
        // Get the access token for this item
        const { data: linkedAccount, error: accountError } = await supabase
          .from('linked_bank_accounts')
          .select('plaid_access_token')
          .eq('plaid_item_id', item_id)
          .eq('is_active', true)
          .single()
        
        if (accountError || !linkedAccount) {
          console.error(`No linked account found for item ${item_id}`)
          break
        }
        
        console.log(`Found linked account for item ${item_id}`)
        
        // Call the sync-transactions function to fetch new data
        try {
          const syncUrl = `${supabaseUrl}/functions/v1/sync-transactions`
          const syncResponse = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              item_id: item_id,
              access_token: linkedAccount.plaid_access_token
            })
          })
          
          if (syncResponse.ok) {
            const syncResult = await syncResponse.json()
            console.log(`Successfully synced transactions for item ${item_id}:`, syncResult)
          } else {
            console.error(`Failed to sync transactions for item ${item_id}`)
          }
        } catch (syncError) {
          console.error(`Error calling sync-transactions for item ${item_id}:`, syncError)
        }
        
        console.log(`WEBHOOK: TRANSACTIONS: ${webhook_code}: Plaid_item_id ${item_id}: New transactions available and synced`)
        break
      }
      
      case 'RECURRING_TRANSACTIONS_UPDATE': {
        console.log(`WEBHOOK: TRANSACTIONS: ${webhook_code}: Plaid_item_id ${item_id}: New recurring transactions available`)
        // You can implement logic here to handle recurring transaction updates
        // This is useful for identifying subscription payments, recurring bills, etc.
        break
      }
      
      case 'TRANSACTIONS_REMOVED': {
        const removedCount = webhookData.removed_transactions?.length || 0
        console.log(`WEBHOOK: TRANSACTIONS: ${webhook_code}: Plaid_item_id ${item_id}: ${removedCount} transactions removed`)
        
        if (webhookData.removed_transactions && webhookData.removed_transactions.length > 0) {
          console.log(`Removed transaction IDs:`, webhookData.removed_transactions)
          // You can implement logic here to handle removed transactions
          // This might include updating your database to mark transactions as removed
        }
        break
      }
      
      case 'DEFAULT_UPDATE':
      case 'INITIAL_UPDATE':
      case 'HISTORICAL_UPDATE': {
        console.log(`WEBHOOK: TRANSACTIONS: ${webhook_code}: Plaid_item_id ${item_id}: Ignored (not needed with sync endpoint)`)
        break
      }
      
      default: {
        console.log(`WEBHOOK: TRANSACTIONS: ${webhook_code}: Plaid_item_id ${item_id}: Unhandled webhook type received`)
      }
    }
    
  } catch (error) {
    console.error('Error handling transactions webhook:', error)
  }
}

/**
 * Check if the circle has reached the collection threshold for payout eligibility
 * This runs when contributions are posted (confirmed by Plaid)
 */
async function checkCollectionThreshold(supabase: any, circle_id: string, transaction: any) {
  try {
    // Get circle details
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circle_id)
      .single()

    if (circleError || !circle) {
      console.error('Error fetching circle for threshold check:', circleError)
      return
    }

    // Get total members in the circle
    const { data: activeMembers, error: membersError } = await supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circle_id)

    if (membersError || !activeMembers) {
      console.error('Error fetching circle members for threshold check:', membersError)
      return
    }

    // Get count of posted contributions for current rotation period
    // Note: This would need to be refined based on your rotation/period logic
    const { data: postedContributions, error: contributionsError } = await supabase
      .from('circle_transactions')
      .select('user_id')
      .eq('circle_id', circle_id)
      .eq('type', 'contribution')
      .eq('status', 'completed') // Only count confirmed/posted contributions
      // TODO: Add date filter for current rotation period
      // .gte('transaction_date', currentPeriodStart)
      // .lte('transaction_date', currentPeriodEnd)

    if (contributionsError) {
      console.error('Error fetching posted contributions for threshold check:', contributionsError)
      return
    }

    const totalMembers = activeMembers.length
    const postedContributionsCount = postedContributions?.length || 0
    const collectionPercentage = totalMembers > 0 ? (postedContributionsCount / totalMembers) * 100 : 0

    console.log(`Collection threshold check for circle ${circle_id}:`, {
      circle_name: circle.name,
      total_members: totalMembers,
      posted_contributions: postedContributionsCount,
      collection_percentage: collectionPercentage.toFixed(1) + '%',
      threshold_met: collectionPercentage >= PAYMENT_CONFIG.COLLECTION_THRESHOLD_PERCENT,
      threshold_required: PAYMENT_CONFIG.COLLECTION_THRESHOLD_PERCENT + '%',
      triggering_transaction_id: transaction.id,
      triggering_user_id: transaction.user_id
    })

    // If threshold is met, log that the circle is eligible for payout
    if (collectionPercentage >= PAYMENT_CONFIG.COLLECTION_THRESHOLD_PERCENT) {
      console.log(`🎯 Circle ${circle_id} (${circle.name}) has reached collection threshold and is eligible for payout`)
      
      // TODO: Trigger payout process or add to payout queue
      // This could involve:
      // 1. Calling a separate payout function
      // 2. Adding to a payout queue/scheduler
      // 3. Sending notifications to the circle recipient
      // 4. Updating circle status to indicate payout readiness
      
      // Example of how you might trigger a payout:
      // await triggerCirclePayout(supabase, circle_id, circle, postedContributions)
    } else {
      const remainingNeeded = Math.ceil((PAYMENT_CONFIG.COLLECTION_THRESHOLD_PERCENT / 100) * totalMembers) - postedContributionsCount
      console.log(`Circle ${circle_id} needs ${remainingNeeded} more contributions to reach payout threshold`)
    }

  } catch (error) {
    console.error('Error in collection threshold check:', error)
  }
}
