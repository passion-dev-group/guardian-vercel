import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface PlaidTransferWebhook {
  webhook_type: 'TRANSFER'
  webhook_code: 'TRANSFER_STATUS_UPDATED' | 'TRANSFER_EVENTS_UPDATE' | 'TRANSFER_CREATED'
  transfer_id: string
  transfer_status: 'pending' | 'posted' | 'cancelled' | 'failed' | 'returned'
  transfer_amount: string
  failure_reason?: {
    ach_return_code?: string
    description?: string
  }
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
    const { transfer_id, transfer_status, failure_reason } = webhookData
    console.log(`Processing transfer webhook: ${transfer_id}, status: ${transfer_status}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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

    // Update transaction status based on Plaid status
    let newStatus: string
    let metadata: any = {
      transfer_status: transfer_status,
      last_webhook_update: new Date().toISOString(),
      webhook_data: webhookData
    }

    switch (transfer_status) {
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
        newStatus = 'processing'
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
    if (transaction.type === 'payout' && transfer_status === 'failed') {
      console.log(`Payout failed for transaction ${transaction.id}, amount: ${transaction.amount}`)
      // Add any special handling for failed payouts here
    }

    if (transaction.type === 'contribution' && transfer_status === 'failed') {
      console.log(`Contribution failed for transaction ${transaction.id}, amount: ${transaction.amount}`)
      // Add any special handling for failed contributions here
    }

    if (transfer_status === 'posted') {
      console.log(`Transfer successful for transaction ${transaction.id}`)
      // Add any special handling for successful transfers here
    }

  } catch (error) {
    console.error('Error handling transfer webhook:', error)
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
