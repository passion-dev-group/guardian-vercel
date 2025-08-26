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
    console.log(`Processing transfer webhook: ${webhookData.webhook_code}`)

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

    // Sync transfer events to get the actual transfer details
    console.log('Syncing transfer events from Plaid...')
    
    // Get the last processed event_id from our database, or start from 0
    const { data: lastEvent } = await supabase
      .from('circle_transactions')
      .select('metadata')
      .not('metadata->plaid_event_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    let afterId = 0 // Default to start from beginning
    if (lastEvent && lastEvent.metadata && lastEvent.metadata.plaid_event_id) {
      afterId = parseInt(lastEvent.metadata.plaid_event_id.toString(), 10)
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

    console.log(`Processing ${syncResponse.data.transfer_events.length} transfer events`)

    // Process each transfer event
    for (const event of syncResponse.data.transfer_events) {
      await processTransferEvent(supabase, event)
    }

  } catch (error) {
    console.error('Error handling transfer webhook:', error)
  }
}

async function processTransferEvent(supabase: any, event: any) {
  try {
    const { transfer_id, event_type, failure_reason, timestamp, event_id } = event
    console.log(`Processing transfer event: ${transfer_id}, type: ${event_type}, event_id: ${event_id}`)

    // Find the transaction record that matches this transfer
    const { data: transaction, error: transactionError } = await supabase
      .from('circle_transactions')
      .select('*')
      .eq('plaid_transfer_id', transfer_id)
      .single()

    if (transactionError || !transaction) {
      console.error(`No transaction found for transfer ${transfer_id}`)
      return
    }

    console.log(`Found transaction ${transaction.id} for transfer ${transfer_id}`)

    // Update transaction status based on Plaid event type
    let newStatus: string
    let metadata: any = {
      event_type: event_type,
      last_webhook_update: new Date().toISOString(),
      event_timestamp: timestamp,
      plaid_event_id: event_id, // Store the event_id to track processed events
      event_data: event
    }

    switch (event_type) {
      case 'posted':
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
        console.log(`Unknown event type: ${event_type}, keeping current status`)
        return
    }

    // Update the transaction
    const { error: updateError } = await supabase
      .from('circle_transactions')
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        metadata: metadata
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return
    }

    console.log(`Transaction ${transaction.id} updated to status: ${newStatus}`)

    // Handle special cases
    if (transaction.type === 'payout' && event_type === 'failed') {
      console.log(`Payout failed for transaction ${transaction.id}, amount: ${transaction.amount}`)
      // Add any special handling for failed payouts here
    }

    if (transaction.type === 'contribution' && event_type === 'failed') {
      console.log(`Contribution failed for transaction ${transaction.id}, amount: ${transaction.amount}`)
      // Add any special handling for failed contributions here
    }

    if (event_type === 'posted') {
      console.log(`Transfer successful for transaction ${transaction.id}`)
      
      // If this is a contribution that was posted, check collection threshold
      if (transaction.type === 'contribution') {
        console.log(`Contribution posted for circle ${transaction.circle_id}, checking collection threshold`)
        await checkCollectionThreshold(supabase, transaction.circle_id, transaction)
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
