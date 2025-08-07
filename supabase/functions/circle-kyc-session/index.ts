import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get the request body
    const body = await req.json()
    console.log('Received request body:', body)
    
    const { user_id } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Creating Circle KYC session for user:', user_id)

    // Get Circle API credentials
    const circleApiKey = Deno.env.get('CIRCLE_API_KEY')
    const circleEnvironment = Deno.env.get('CIRCLE_ENVIRONMENT') || 'sandbox'
    
    console.log('Circle configuration:', {
      environment: circleEnvironment,
      apiKey: circleApiKey ? '***' + circleApiKey.slice(-4) : 'NOT_SET'
    })

    // Validate environment variables
    if (!circleApiKey) {
      console.error('Missing Circle API key')
      return new Response(
        JSON.stringify({ 
          error: 'Circle configuration error',
          message: 'Missing Circle API credentials'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const baseUrl = circleEnvironment === 'production' 
      ? 'https://api.circle.com' 
      : 'https://api-sandbox.circle.com'

    // Create KYC session with Circle
    console.log('Calling Circle API to create KYC session...')
    const response = await fetch(`${baseUrl}/v1/w3s/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user_id,
        idempotencyKey: `kyc-${user_id}-${Date.now()}`,
      }),
    })

    console.log('Circle API response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Circle API error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle KYC session creation failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userData = await response.json()
    console.log('Circle user created:', userData)

    // Create KYC session
    const kycResponse = await fetch(`${baseUrl}/v1/w3s/users/${userData.data.user.id}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotencyKey: `kyc-token-${user_id}-${Date.now()}`,
      }),
    })

    if (!kycResponse.ok) {
      const errorData = await kycResponse.json()
      console.error('Circle KYC token error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle KYC token creation failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const kycData = await kycResponse.json()
    console.log('Circle KYC session created successfully')

    return new Response(
      JSON.stringify({
        sessionToken: kycData.data.userToken,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        redirectUrl: `https://sandbox.circle.com/w3s/kyc?userToken=${kycData.data.userToken}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Circle KYC session:', error)
    
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