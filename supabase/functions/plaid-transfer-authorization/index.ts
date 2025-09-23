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
  type?: 'debit' | 'credit';
  network?: 'ach';
  amount: string;
  ach_class?: 'ppd' | 'ccd';
  // Optional: if not provided, we will enrich from profile/headers
  user?: {
    legal_name?: string;
    phone_number?: string;
    email_address?: string;
    address?: {
      street?: string;
      city?: string;
      region?: string;
      postal_code?: string;
      country?: string;
    };
  };
  device?: {
    user_agent?: string;
    ip_address?: string;
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

    // Build Supabase client to fetch user profile
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    let profile: any = null
    if (user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('display_name, email, phone, address_street, address_city, address_state, address_zip, address_country')
        .eq('id', user.id)
        .maybeSingle()
      profile = p
    }

    // Derive user fields
    const enrichedUser = {
      legal_name: authRequest.user?.legal_name || profile?.display_name || 'Unknown',
      phone_number: authRequest.user?.phone_number || profile?.phone || '',
      email_address: authRequest.user?.email_address || profile?.email || user?.email || '',
      address: {
        street: authRequest.user?.address?.street || profile?.address_street || '',
        city: authRequest.user?.address?.city || profile?.address_city || '',
        region: authRequest.user?.address?.region || profile?.address_state || '',
        postal_code: authRequest.user?.address?.postal_code || profile?.address_zip || '',
        country: authRequest.user?.address?.country || profile?.address_country || 'US',
      }
    }

    // Derive device fields from headers
    const forwardedFor = req.headers.get('x-forwarded-for') || ''
    const ip = authRequest.device?.ip_address || forwardedFor.split(',')[0]?.trim() || ''
    const ua = authRequest.device?.user_agent || req.headers.get('user-agent') || ''

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
      type: authRequest.type || 'debit',
      network: authRequest.network || 'ach',
      amount: authRequest.amount,
      ach_class: authRequest.ach_class || 'ppd',
      user: enrichedUser as any,
      device: { user_agent: ua, ip_address: ip },
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