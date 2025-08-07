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
    console.log('Received test transaction request:', body)
    
    const { wallet_id, amount = '0.01' } = body

    if (!wallet_id) {
      return new Response(
        JSON.stringify({ error: 'wallet_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Creating test transaction for wallet:', wallet_id)

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

    // Create a test transaction for wallet verification
    // In sandbox mode, this creates a transaction that the user can sign
    const transferPayload = {
      idempotencyKey: `test-tx-${wallet_id}-${Date.now()}`,
      source: {
        type: 'wallet',
        id: wallet_id,
      },
      destination: {
        type: 'blockchain',
        address: '0x0000000000000000000000000000000000000000', // Burn address for test
        chain: 'ETH',
      },
      amounts: [{
        amount: amount,
        currency: 'USD',
      }],
      description: 'Wallet verification test transaction',
    }

    console.log('Creating Circle test transfer:', transferPayload)

    const response = await fetch(`${baseUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    })

    console.log('Circle test transaction response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Circle test transaction error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle test transaction failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const transferData = await response.json()
    console.log('Circle test transaction created successfully')

    return new Response(
      JSON.stringify({
        id: transferData.data.id,
        source: transferData.data.source,
        destination: transferData.data.destination,
        amount: transferData.data.amount,
        status: transferData.data.status,
        transactionHash: transferData.data.transactionHash,
        createdAt: transferData.data.createDate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Circle test transaction:', error)
    
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