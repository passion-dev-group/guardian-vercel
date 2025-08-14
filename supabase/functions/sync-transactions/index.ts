import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SyncTransactionsRequest {
  item_id: string
  access_token: string
  cursor?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    // Get the request body
    const { item_id, access_token, cursor }: SyncTransactionsRequest = await req.json()

    if (!item_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: item_id, access_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Plaid client
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
    const plaidClient = new PlaidApi(configuration)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Sync transactions using Plaid's /transactions/sync endpoint
    const syncResponse = await plaidClient.transactionsSync({
      access_token: access_token,
      cursor: cursor,
      count: 100, // Adjust based on your needs
    })

    const { added, modified, removed, has_more, next_cursor } = syncResponse.data

    console.log(`Sync results for item ${item_id}:`, {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      has_more,
      next_cursor
    })

    // Process added transactions
    if (added.length > 0) {
      await processAddedTransactions(added, supabase, item_id)
    }

    // Process modified transactions
    if (modified.length > 0) {
      await processModifiedTransactions(modified, supabase, item_id)
    }

    // Process removed transactions
    if (removed.length > 0) {
      await processRemovedTransactions(removed, supabase, item_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transactions synced successfully',
        results: {
          added: added.length,
          modified: modified.length,
          removed: removed.length,
          has_more,
          next_cursor
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error syncing transactions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to sync transactions' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function processAddedTransactions(transactions: any[], supabase: any, itemId: string) {
  try {
    console.log(`Processing ${transactions.length} added transactions for item ${itemId}`)
    
    // You can implement your logic here to:
    // 1. Store new transactions in your database
    // 2. Update account balances
    // 3. Trigger notifications
    // 4. Update analytics
    
    for (const transaction of transactions) {
      console.log(`New transaction: ${transaction.name} - ${transaction.amount} - ${transaction.date}`)
      
      // Example: Store transaction in a transactions table
      // const { error } = await supabase
      //   .from('transactions')
      //   .insert({
      //     plaid_transaction_id: transaction.transaction_id,
      //     plaid_item_id: itemId,
      //     account_id: transaction.account_id,
      //     name: transaction.name,
      //     amount: transaction.amount,
      //     date: transaction.date,
      //     category: transaction.category,
      //     pending: transaction.pending,
      //     metadata: transaction
      //   })
      
      // if (error) {
      //   console.error('Error storing transaction:', error)
      // }
    }
    
  } catch (error) {
    console.error('Error processing added transactions:', error)
  }
}

async function processModifiedTransactions(transactions: any[], supabase: any, itemId: string) {
  try {
    console.log(`Processing ${transactions.length} modified transactions for item ${itemId}`)
    
    // You can implement your logic here to:
    // 1. Update existing transactions in your database
    // 2. Handle changes in amounts, categories, etc.
    
    for (const transaction of transactions) {
      console.log(`Modified transaction: ${transaction.name} - ${transaction.amount} - ${transaction.date}`)
      
      // Example: Update transaction in database
      // const { error } = await supabase
      //   .from('transactions')
      //   .update({
      //     name: transaction.name,
      //     amount: transaction.amount,
      //     date: transaction.date,
      //     category: transaction.category,
      //     pending: transaction.pending,
      //     metadata: transaction,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('plaid_transaction_id', transaction.transaction_id)
      
      // if (error) {
      //   console.error('Error updating transaction:', error)
      // }
    }
    
  } catch (error) {
    console.error('Error processing modified transactions:', error)
  }
}

async function processRemovedTransactions(transactions: any[], supabase: any, itemId: string) {
  try {
    console.log(`Processing ${transactions.length} removed transactions for item ${itemId}`)
    
    // You can implement your logic here to:
    // 1. Mark transactions as removed in your database
    // 2. Handle transaction reversals
    // 3. Update account balances
    
    for (const transaction of transactions) {
      console.log(`Removed transaction: ${transaction.transaction_id}`)
      
      // Example: Mark transaction as removed
      // const { error } = await supabase
      //   .from('transactions')
      //   .update({
      //     is_removed: true,
      //     removed_at: new Date().toISOString(),
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('plaid_transaction_id', transaction.transaction_id)
      
      // if (error) {
      //   console.error('Error marking transaction as removed:', error)
      // }
    }
    
  } catch (error) {
    console.error('Error processing removed transactions:', error)
  }
}
