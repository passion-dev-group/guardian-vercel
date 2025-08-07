import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('Received KYC status check request:', body)
    
    const { user_id } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Checking Circle KYC status for user:', user_id)

    // Get Circle API credentials
    const circleApiKey = Deno.env.get('CIRCLE_API_KEY')
    const circleEnvironment = Deno.env.get('CIRCLE_ENVIRONMENT') || 'sandbox'
    
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

    // Get user from Circle using external user ID
    console.log('Fetching Circle user data...')
    const response = await fetch(`${baseUrl}/v1/w3s/users?userId=${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Circle user lookup response status:', response.status)
    
    if (!response.ok) {
      if (response.status === 404) {
        // User not found in Circle, means KYC not started
        return new Response(
          JSON.stringify({
            kycStatus: {
              status: 'pending',
              userId: user_id,
              createdAt: new Date().toISOString(),
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const errorData = await response.json()
      console.error('Circle user lookup error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle user lookup failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userData = await response.json()
    console.log('Circle user data retrieved successfully')

    // Extract KYC status from Circle user data
    const user = userData.data.users[0]
    let kycStatus = 'pending'
    
    if (user.status === 'ENABLED') {
      kycStatus = 'approved'
    } else if (user.status === 'DISABLED') {
      kycStatus = 'denied'
    } else if (user.status === 'PENDING') {
      kycStatus = 'review'
    }

    return new Response(
      JSON.stringify({
        kycStatus: {
          status: kycStatus,
          userId: user.id,
          verificationToken: user.token,
          createdAt: user.createDate,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking Circle KYC status:', error)
    
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