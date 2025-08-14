import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Get all active recurring contributions that are due
    const now = new Date()
    const { data: dueContributions, error: fetchError } = await supabase
      .from('recurring_contributions')
      .select(`
        *,
        circle:circles(id, name, contribution_amount, frequency),
        user:profiles!recurring_contributions_user_id_fkey(id, display_name, avatar_url, phone, email)
      `)
      .eq('is_active', true)
      .lte('next_contribution_date', now.toISOString())

    if (fetchError) {
      console.error('Error fetching due contributions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch due contributions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!dueContributions || dueContributions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No due recurring contributions found',
          processed: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${dueContributions.length} due recurring contributions`)

    const results = []

    for (const contribution of dueContributions) {
      try {
        console.log(`Processing recurring contribution for user ${contribution.user_id} to circle ${contribution.circle_id}`)

        // Get user's linked bank account
        const { data: linkedAccount, error: accountError } = await supabase
          .from('linked_bank_accounts')
          .select('*')
          .eq('user_id', contribution.user_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (accountError || !linkedAccount) {
          console.error(`No linked bank account found for user ${contribution.user_id}`)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            circle_id: contribution.circle_id,
            status: 'failed',
            error: 'No linked bank account found'
          })
          continue
        }

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
          .from('circle_transactions')
          .insert({
            circle_id: contribution.circle_id,
            user_id: contribution.user_id,
            amount: contribution.amount,
            type: 'contribution',
            status: 'pending',
            transaction_date: now.toISOString(),
            description: `Recurring contribution to ${contribution.circle.name}`,
          })
          .select()
          .single()

        if (transactionError) {
          console.error('Error creating transaction record:', transactionError)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            circle_id: contribution.circle_id,
            status: 'failed',
            error: 'Failed to create transaction record'
          })
          continue
        }

        // Process payment through Plaid
        try {
          // Create transfer authorization
          const authorizationRequest = {
            access_token: linkedAccount.plaid_access_token,
            account_id: linkedAccount.plaid_account_id,
            type: 'debit' as const,
            network: 'ach' as const,
            amount: contribution.amount.toFixed(2),
            ach_class: 'ppd' as const,
            user: {
              legal_name: contribution.user.display_name || 'Unknown User',
              phone_number: contribution.user.phone || '+15551234567',
              email_address: contribution.user.email || 'user@example.com',
              address: {
                street: '123 Main St',
                city: 'City',
                country: 'US',
              },
            },
            device: {
              user_agent: 'Savings Circle App/1.0',
              ip_address: '127.0.0.1',
            },
          }

          const authResponse = await plaidClient.transferAuthorizationCreate(authorizationRequest)
          const authorization = authResponse.data.authorization

          if (authorization.decision !== 'approved') {
            console.error('Transfer authorization denied:', authorization.decision_rationale)
            
            await supabase
              .from('circle_transactions')
              .update({ status: 'failed' })
              .eq('id', transaction.id)

            results.push({
              contribution_id: contribution.id,
              user_id: contribution.user_id,
              circle_id: contribution.circle_id,
              status: 'failed',
              error: 'Transfer authorization denied',
              transaction_id: transaction.id
            })
            continue
          }

          // Create the actual transfer
          const transferRequest = {
            access_token: linkedAccount.plaid_access_token,
            account_id: linkedAccount.plaid_account_id,
            authorization_id: authorization.id,
            type: 'debit' as const,
            network: 'ach' as const,
            amount: contribution.amount.toFixed(2),
            description: `Recurring contribution to ${contribution.circle.name}`,
            ach_class: 'ppd' as const,
            user: authorizationRequest.user,
            device: authorizationRequest.device,
          }

          const transferResponse = await plaidClient.transferCreate(transferRequest)
          const transfer = transferResponse.data.transfer

          // Update transaction with transfer details
          await supabase
            .from('circle_transactions')
            .update({
              status: 'completed',
              plaid_transfer_id: transfer.id,
              plaid_authorization_id: authorization.id,
            })
            .eq('id', transaction.id)

          // Calculate next contribution date
          const nextDate = calculateNextContributionDate(
            contribution.frequency,
            contribution.day_of_week,
            contribution.day_of_month
          )

          // Update recurring contribution with next date
          await supabase
            .from('recurring_contributions')
            .update({
              next_contribution_date: nextDate.toISOString(),
            })
            .eq('id', contribution.id)

          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            circle_id: contribution.circle_id,
            status: 'completed',
            transaction_id: transaction.id,
            plaid_transfer_id: transfer.id,
            amount: contribution.amount
          })

          console.log(`Successfully processed recurring contribution ${contribution.id}`)

        } catch (plaidError) {
          console.error('Plaid transfer error:', plaidError)
          
          await supabase
            .from('circle_transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id)

          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            circle_id: contribution.circle_id,
            status: 'failed',
            error: 'Plaid transfer failed',
            transaction_id: transaction.id
          })
        }

      } catch (error) {
        console.error(`Error processing contribution ${contribution.id}:`, error)
        results.push({
          contribution_id: contribution.id,
          user_id: contribution.user_id,
          circle_id: contribution.circle_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'completed').length
    const failureCount = results.filter(r => r.status === 'failed').length

    console.log(`Processed ${results.length} recurring contributions: ${successCount} successful, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} recurring contributions`,
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing recurring contributions:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function to calculate next contribution date
function calculateNextContributionDate(
  frequency: 'weekly' | 'biweekly' | 'monthly',
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date()
  const nextDate = new Date(now)

  switch (frequency) {
    case 'weekly':
      if (dayOfWeek !== undefined) {
        const currentDay = now.getDay()
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7
        nextDate.setDate(now.getDate() + daysToAdd)
      } else {
        nextDate.setDate(now.getDate() + 7)
      }
      break

    case 'biweekly':
      if (dayOfWeek !== undefined) {
        const currentDay = now.getDay()
        const daysToAdd = (dayOfWeek - currentDay + 14) % 14
        nextDate.setDate(now.getDate() + daysToAdd)
      } else {
        nextDate.setDate(now.getDate() + 14)
      }
      break

    case 'monthly':
      if (dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth)
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
      } else {
        nextDate.setMonth(now.getMonth() + 1)
      }
      break
  }

  return nextDate
} 