import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments, TransferAuthorizationCreateRequest, TransferAuthorizationCreateResponse } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AuthorizationRequest {
  access_token: string;
  account_id: string;
  type: 'debit' | 'credit';
  network: 'ach';
  amount: string;
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
    const authRequest: AuthorizationRequest = await req.json()

    // Validate required fields
    if (!authRequest.access_token || !authRequest.account_id || !authRequest.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: access_token, account_id, amount' }),
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

    // Create authorization request
    const request: TransferAuthorizationCreateRequest = {
      access_token: authRequest.access_token,
      account_id: authRequest.account_id,
      type: authRequest.type,
      network: authRequest.network,
      amount: authRequest.amount,
      ach_class: authRequest.ach_class,
      user: authRequest.user,
      device: authRequest.device,
    }

    console.log('Creating Plaid transfer authorization with request:', JSON.stringify(request, null, 2))

    // Create the authorization
    const response: TransferAuthorizationCreateResponse = await plaidClient.transferAuthorizationCreate(request)

    console.log('Plaid transfer authorization created successfully:', response.data)

    return new Response(
      JSON.stringify({
        success: true,
        authorization_id: response.data.authorization.id,
        status: response.data.authorization.status,
        amount: response.data.authorization.amount,
        ach_class: response.data.authorization.ach_class,
        network: response.data.authorization.network,
        type: response.data.authorization.type,
        user: response.data.authorization.user,
        account_id: response.data.authorization.account_id,
        decision: response.data.authorization.decision,
        decision_rationale: response.data.authorization.decision_rationale,
        guarantee_decision: response.data.authorization.guarantee_decision,
        guarantee_decision_rationale: response.data.authorization.guarantee_decision_rationale,
        created: response.data.authorization.created,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Plaid transfer authorization:', error)
    
    // Handle specific Plaid errors
    if (error.response?.data) {
      const plaidError = error.response.data
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Plaid authorization failed',
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