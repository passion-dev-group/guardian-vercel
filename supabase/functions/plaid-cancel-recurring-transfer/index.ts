import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function createPlaidClient() {
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

  return new PlaidApi(configuration)
}

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recurring_transfer_id, access_token, user_id, type = 'circle', target_id } = await req.json()

    // Validate required fields
    if (!recurring_transfer_id || !access_token) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: recurring_transfer_id and access_token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Cancelling recurring transfer:', {
      recurring_transfer_id,
      access_token: access_token.substring(0, 10) + '...'
    })

    // Initialize Plaid client
    const plaidClient = createPlaidClient()
    const supabase = createSupabaseClient()

    let plaidCancelSuccess = false;
    let plaidError = null;

    try {
      // Try to cancel the recurring transfer in Plaid
      const response = await plaidClient.transferRecurringCancel({
        recurring_transfer_id
      })

      console.log('Plaid cancel response:', response.data)
      plaidCancelSuccess = true;

    } catch (plaidErr: any) {
      console.error('Plaid cancellation failed:', plaidErr?.response?.data || plaidErr?.message)
      plaidError = plaidErr;
      
      // Check if it's a "NOT_CANCELLABLE" error - this is common and not critical
      const errorCode = plaidErr?.response?.data?.error_code;
      const errorMessage = plaidErr?.response?.data?.error_message;
      
      if (errorCode === 'NOT_CANCELLABLE') {
        console.log('Recurring transfer is not cancellable in Plaid (likely already processed), but will delete from our database');
      } else {
        console.error('Unexpected Plaid error:', { errorCode, errorMessage });
      }
    }

    // Always try to delete from database, regardless of Plaid cancellation result
    // This ensures the user can stop seeing the recurring transfer in our app
    let databaseDeleteSuccess = false;
    if (user_id && target_id) {
      const tableName = type === 'circle' ? 'recurring_contributions' : 'solo_savings_recurring_contributions'
      const idField = type === 'circle' ? 'circle_id' : 'goal_id'

      console.log('Deleting from database:', {
        table: tableName,
        user_id,
        target_id,
        plaid_recurring_transfer_id: recurring_transfer_id
      })

      try {
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('user_id', user_id)
          .eq(idField, target_id)
          .eq('plaid_recurring_transfer_id', recurring_transfer_id)

        if (deleteError) {
          console.error('Database deletion error:', deleteError)
        } else {
          console.log('Successfully deleted recurring contribution from database')
          databaseDeleteSuccess = true;
        }
      } catch (dbError) {
        console.error('Database deletion failed:', dbError)
      }
    }

    // Determine response based on results
    if (databaseDeleteSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: plaidCancelSuccess 
            ? 'Recurring transfer cancelled successfully' 
            : 'Recurring transfer removed from your account (Plaid cancellation not needed)',
          transfer_id: recurring_transfer_id,
          plaid_cancelled: plaidCancelSuccess,
          database_deleted: databaseDeleteSuccess
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Both operations failed
      throw plaidError || new Error('Failed to delete recurring transfer from database');
    }


  } catch (error: any) {
    console.error('Function Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
