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

  // Check for authorization header
  const authHeader = req.headers.get('authorization')
  console.log('Authorization header:', authHeader ? 'Present' : 'Missing')
  
  // For now, allow the request to proceed without strict auth check
  // In production, you should validate the JWT token

  try {
    // Get the request body
    const body = await req.json()
    console.log('Received request body:', body)
    
    const { public_token } = body

    if (!public_token) {
      return new Response(
        JSON.stringify({ error: 'public_token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing public token exchange for token:', public_token.substring(0, 20) + '...')

    // Initialize Plaid client
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox'
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')
    const plaidSecret = Deno.env.get('PLAID_SECRET')
    
    console.log('Plaid configuration:', {
      env: plaidEnv,
      clientId: plaidClientId ? '***' + plaidClientId.slice(-4) : 'NOT_SET',
      secret: plaidSecret ? '***' + plaidSecret.slice(-4) : 'NOT_SET'
    })

    // Validate environment variables
    if (!plaidClientId || !plaidSecret) {
      console.error('Missing Plaid environment variables:', {
        clientId: !!plaidClientId,
        secret: !!plaidSecret
      })
      return new Response(
        JSON.stringify({ 
          error: 'Plaid configuration error',
          message: 'Missing Plaid API credentials'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

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

    // Exchange public token for access token
    console.log('Calling Plaid itemPublicTokenExchange...')
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    })
    console.log('Plaid exchange response received:', {
      access_token: exchangeResponse.data.access_token ? '***' + exchangeResponse.data.access_token.slice(-4) : 'NOT_SET',
      item_id: exchangeResponse.data.item_id
    })

    return new Response(
      JSON.stringify({
        access_token: exchangeResponse.data.access_token,
        item_id: exchangeResponse.data.item_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error exchanging public token:', error)
    
    // Handle specific Plaid errors
    if (error.response?.data) {
      const plaidError = error.response.data
      return new Response(
        JSON.stringify({
          error: 'Plaid token exchange failed',
          plaid_error: plaidError.error_code,
          plaid_message: plaidError.error_message,
          request_id: plaidError.request_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 