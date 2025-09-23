import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handleError = async (supabase: any, message: string, status: number) => {
  console.error(message)
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { 
      action,
      test_clock_id, 
      virtual_time,
      recurring_transfer_id 
    } = await req.json()

    // Handle clock creation
    if (action === 'create_clock') {
      if (!virtual_time) {
        return await handleError(null, 'virtual_time is required for creating test clock', 400)
      }

      // Initialize Plaid client
      const plaidClient = new PlaidApi(
        new Configuration({
          basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
              'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
            },
          },
        })
      )

      // Create test clock
      console.log(`Creating test clock with virtual time: ${virtual_time}`)
      const createResponse = await plaidClient.sandboxTransferTestClockCreate({
        virtual_time: virtual_time
      })

      console.log('Test clock created successfully:', createResponse.data.test_clock.test_clock_id)

      return new Response(
        JSON.stringify({
          success: true,
          test_clock_id: createResponse.data.test_clock.test_clock_id,
          virtual_time: virtual_time,
          message: 'Test clock created successfully'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle clock advancement (existing logic)
    if (!test_clock_id || !virtual_time) {
      return await handleError(null, 'test_clock_id and virtual_time are required for advancing clock', 400)
    }

    // Initialize Plaid client
    const plaidClient = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
            'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
          },
        },
      })
    )

    // Advance the test clock
    console.log(`Advancing test clock ${test_clock_id} to ${virtual_time}`)
    const advanceResponse = await plaidClient.sandboxTransferTestClockAdvance({
      test_clock_id: test_clock_id,
      virtual_time: virtual_time
    })

    console.log('Test clock advanced successfully')

    // If recurring_transfer_id is provided, check for generated transfers
    let transferDetails = null
    if (recurring_transfer_id) {
      try {
        const recurringTransferDetails = await plaidClient.transferRecurringGet({
          recurring_transfer_id: recurring_transfer_id
        })
        
        if (recurringTransferDetails.data.recurring_transfer) {
          const transferCount = recurringTransferDetails.data.recurring_transfer.transfer_ids?.length || 0
          console.log(`Recurring transfer status: ${recurringTransferDetails.data.recurring_transfer.status}`)
          console.log(`Generated ${transferCount} transfer(s) so far`)
          
          transferDetails = {
            status: recurringTransferDetails.data.recurring_transfer.status,
            transfer_count: transferCount,
            transfer_ids: recurringTransferDetails.data.recurring_transfer.transfer_ids
          }
        }
      } catch (checkError) {
        console.warn('Failed to check recurring transfer details:', checkError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_clock_id: test_clock_id,
        virtual_time: virtual_time,
        message: 'Test clock advanced successfully',
        transfer_details: transferDetails
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error advancing test clock:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
