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
    console.log('Received Circle user request:', body)
    
    const { user_id } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Fetching Circle user data for:', user_id)

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

    // Get user from Circle
    console.log('Fetching Circle user...')
    const userResponse = await fetch(`${baseUrl}/v1/w3s/users?userId=${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('Circle user response status:', userResponse.status)
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json()
      console.error('Circle user fetch error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle user fetch failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.data.users[0]
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found in Circle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get user's wallets
    console.log('Fetching Circle wallets for user:', user.id)
    const walletsResponse = await fetch(`${baseUrl}/v1/w3s/wallets?userId=${user.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    let wallets = []
    if (walletsResponse.ok) {
      const walletsData = await walletsResponse.json()
      wallets = walletsData.data.wallets.map((wallet: any) => ({
        id: wallet.id,
        address: wallet.address,
        userId: wallet.userId,
        status: wallet.state,
        balances: {
          usdc: wallet.accountType === 'SCA' ? '0' : '0', // Default balance
          currency: 'USD',
        },
        createdAt: wallet.createDate,
      }))
    }

    console.log('Circle user data retrieved successfully')

    // Map Circle user status to our KYC status
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
        id: user.id,
        kycStatus: {
          status: kycStatus,
          userId: user.id,
          verificationToken: user.token,
          createdAt: user.createDate,
        },
        wallets: wallets,
        createdAt: user.createDate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching Circle user:', error)
    
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