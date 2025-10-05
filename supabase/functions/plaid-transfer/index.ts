import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments, TransferCreateRequest, TransferCreateResponse } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TransferRequest {
  access_token: string;
  account_id: string;
  authorization_id: string;
  type: 'debit' | 'credit';
  network: 'ach';
  amount: string;
  description: string;
  ach_class: 'ppd' | 'ccd';
  user: {
    legal_name: string;
    phone_number: string;
    email_address: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  device: {
    user_agent: string;
    ip_address: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const transferRequest: TransferRequest = await req.json()

    // Validate required fields
    if (!transferRequest.access_token || !transferRequest.account_id || !transferRequest.authorization_id || !transferRequest.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: access_token, account_id, authorization_id, amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

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

    // Create transfer request
    // When using authorization_id, we don't include type, ach_class, user, or device
    // Those were already specified during authorization
    const request: TransferCreateRequest = {
      access_token: transferRequest.access_token,
      account_id: transferRequest.account_id,
      authorization_id: transferRequest.authorization_id,
      amount: transferRequest.amount,
      description: transferRequest.description,
    }

    console.log('Creating Plaid transfer with request:', JSON.stringify(request, null, 2))

    // Create the transfer
    const response: TransferCreateResponse = await plaidClient.transferCreate(request)

    console.log('Plaid transfer created successfully:', response.data)

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: response.data.transfer.id,
        status: response.data.transfer.status,
        amount: response.data.transfer.amount,
        description: response.data.transfer.description,
        created: response.data.transfer.created,
        ach_class: response.data.transfer.ach_class,
        network: response.data.transfer.network,
        type: response.data.transfer.type,
        user: response.data.transfer.user,
        account_id: response.data.transfer.account_id,
        authorization_id: response.data.transfer.authorization_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Plaid transfer:', error)
    
    // Handle specific Plaid errors
    if (error.response?.data) {
      const plaidError = error.response.data
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Plaid transfer failed',
          plaid_error: plaidError.error_code,
          plaid_message: plaidError.error_message,
          request_id: plaidError.request_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 