import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments, TransferCreateRequest, TransferAuthorizationCreateRequest } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ProcessSoloSavingsRequest {
  goal_id?: string; // If provided, process only this goal
  user_id?: string; // If provided, process only this user
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestData: ProcessSoloSavingsRequest = await req.json()

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

    // Build query for due contributions
    let query = supabase
      .from('solo_savings_recurring_contributions')
      .select(`
        *,
        goal:solo_savings_goals(id, name, target_amount, current_amount, user_id),
        user:profiles!solo_savings_recurring_contributions_user_id_fkey(id, display_name, email, phone),
        bank_account:linked_bank_accounts!solo_savings_recurring_contributions_user_id_fkey(
          id, 
          access_token, 
          account_id, 
          account_name,
          account_type,
          user_id
        )
      `)
      .eq('is_active', true)
      .lte('next_contribution_date', new Date().toISOString())

    // Apply filters if provided
    if (requestData.goal_id) {
      query = query.eq('goal_id', requestData.goal_id)
    }
    if (requestData.user_id) {
      query = query.eq('user_id', requestData.user_id)
    }

    const { data: dueContributions, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching due solo savings contributions:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch due contributions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!dueContributions || dueContributions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No due solo savings contributions found',
          processed: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${dueContributions.length} due solo savings contributions`)

    const results = []

    for (const contribution of dueContributions) {
      try {
        console.log(`Processing solo savings contribution for user ${contribution.user_id} to goal ${contribution.goal_id}`)

        // Check if goal still exists and is active
        if (!contribution.goal || contribution.goal.user_id !== contribution.user_id) {
          console.error(`Goal ${contribution.goal_id} not found or user mismatch`)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: 'Goal not found or user mismatch'
          })
          continue
        }

        // Check if goal has reached target
        if (contribution.goal.current_amount >= contribution.goal.target_amount) {
          console.log(`Goal ${contribution.goal_id} has reached target, deactivating contribution`)
          
          await supabase
            .from('solo_savings_recurring_contributions')
            .update({ is_active: false })
            .eq('id', contribution.id)

          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'completed',
            message: 'Goal target reached, contribution deactivated'
          })
          continue
        }

        // Check if user has a linked bank account
        if (!contribution.bank_account || !contribution.bank_account.access_token) {
          console.error(`User ${contribution.user_id} has no linked bank account for transfers`)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: 'No linked bank account found'
          })
          continue
        }

        // Step 1: Create transfer authorization
        let authorizationId: string
        try {
          console.log(`Creating transfer authorization for $${contribution.amount} to goal: ${contribution.goal.name}`)
          
          const authRequest: TransferAuthorizationCreateRequest = {
            access_token: contribution.bank_account.access_token,
            account_id: contribution.bank_account.account_id,
            type: 'debit', // Money going OUT of the user's account
            network: 'ach',
            amount: contribution.amount.toString(),
            ach_class: 'ppd',
            user: {
              legal_name: contribution.user.display_name || 'User',
              phone_number: contribution.user.phone || '',
              email_address: contribution.user.email || '',
              address: {
                street: '',
                city: '',
                state: '',
                zip: '',
                country: ''
              }
            },
            device: {
              user_agent: 'SoloSavingsBot/1.0',
              ip_address: '127.0.0.1'
            }
          }

          const authResponse = await plaidClient.transferAuthorizationCreate(authRequest)
          authorizationId = authResponse.data.authorization.id
          
          console.log(`Transfer authorization created: ${authorizationId}`)
          
        } catch (authError) {
          console.error(`Error creating transfer authorization:`, authError)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: `Authorization failed: ${authError.message}`
          })
          continue
        }

        // Step 2: Create the actual transfer
        let transferId: string
        try {
          console.log(`Creating Plaid transfer with authorization ${authorizationId}`)
          
          const transferRequest: TransferCreateRequest = {
            access_token: contribution.bank_account.access_token,
            account_id: contribution.bank_account.account_id,
            authorization_id: authorizationId,
            type: 'debit',
            network: 'ach',
            amount: contribution.amount.toString(),
            description: `Solo savings contribution to ${contribution.goal.name}`,
            ach_class: 'ppd',
            user: {
              legal_name: contribution.user.display_name || 'User',
              phone_number: contribution.user.phone || '',
              email_address: contribution.user.email || '',
              address: {
                street: '',
                city: '',
                state: '',
                zip: '',
                country: ''
              }
            },
            device: {
              user_agent: 'SoloSavingsBot/1.0',
              ip_address: '127.0.0.1'
            }
          }

          const transferResponse = await plaidClient.transferCreate(transferRequest)
          transferId = transferResponse.data.transfer.id
          
          console.log(`Plaid transfer created successfully: ${transferId}`)
          
        } catch (transferError) {
          console.error(`Error creating Plaid transfer:`, transferError)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: `Transfer failed: ${transferError.message}`
          })
          continue
        }

        // Step 3: Create transaction record
        const { data: transaction, error: transactionError } = await supabase
          .from('solo_savings_transactions')
          .insert({
            goal_id: contribution.goal_id,
            user_id: contribution.user_id,
            amount: contribution.amount,
            type: 'recurring_contribution',
            status: 'pending', // Will be updated via webhook
            transaction_date: new Date().toISOString(),
            description: `Recurring contribution to ${contribution.goal.name}`,
            metadata: {
              contribution_id: contribution.id,
              transfer_type: 'plaid_ach',
              bank_account: contribution.bank_account.account_name,
              plaid_transfer_id: transferId,
              plaid_authorization_id: authorizationId
            }
          })
          .select()
          .single()

        if (transactionError) {
          console.error(`Error creating transaction record:`, transactionError)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: `Failed to create transaction record: ${transactionError.message}`
          })
          continue
        }

        // Step 4: Update goal current amount (assuming transfer will succeed)
        const { error: updateError } = await supabase
          .from('solo_savings_goals')
          .update({ 
            current_amount: contribution.goal.current_amount + contribution.amount 
          })
          .eq('id', contribution.goal_id)

        if (updateError) {
          console.error(`Error updating goal amount:`, updateError)
          results.push({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            goal_id: contribution.goal_id,
            status: 'failed',
            error: `Failed to update goal amount: ${updateError.message}`
          })
          continue
        }

        // Step 5: Calculate and update next contribution date
        const nextDate = calculateNextContributionDate(
          contribution.frequency,
          contribution.day_of_week,
          contribution.day_of_month
        )

        const { error: nextDateError } = await supabase
          .from('solo_savings_recurring_contributions')
          .update({
            next_contribution_date: nextDate.toISOString(),
          })
          .eq('id', contribution.id)

        if (nextDateError) {
          console.error(`Error updating next contribution date:`, nextDateError)
        }

        results.push({
          contribution_id: contribution.id,
          user_id: contribution.user_id,
          goal_id: contribution.goal_id,
          status: 'completed',
          transaction_id: transaction.id,
          amount: contribution.amount,
          new_goal_amount: contribution.goal.current_amount + contribution.amount,
          transfer_type: 'plaid_ach',
          plaid_transfer_id: transferId,
          plaid_authorization_id: authorizationId
        })

        console.log(`Successfully processed solo savings contribution ${contribution.id}`)

      } catch (error) {
        console.error(`Error processing solo savings contribution ${contribution.id}:`, error)
        results.push({
          contribution_id: contribution.id,
          user_id: contribution.user_id,
          goal_id: contribution.goal_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'completed').length
    const failureCount = results.filter(r => r.status === 'failed').length

    console.log(`Processed ${results.length} solo savings contributions: ${successCount} successful, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} solo savings contributions`,
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing solo savings contributions:', error)
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
        nextDate.setDate(now.getDate() + 14)
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
