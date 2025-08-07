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
    console.log('Received transfer request:', body)
    
    const { 
      source_wallet_id, 
      destination_wallet_id, 
      destination_address, 
      amount, 
      description 
    } = body

    if (!source_wallet_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'source_wallet_id and amount are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!destination_wallet_id && !destination_address) {
      return new Response(
        JSON.stringify({ error: 'Either destination_wallet_id or destination_address is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing USDC transfer...')

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

    // Prepare transfer payload
    const transferPayload: any = {
      idempotencyKey: `transfer-${source_wallet_id}-${Date.now()}`,
      source: {
        type: 'wallet',
        id: source_wallet_id,
      },
      amounts: [{
        amount: amount,
        currency: 'USD',
      }],
    }

    if (destination_wallet_id) {
      transferPayload.destination = {
        type: 'wallet',
        id: destination_wallet_id,
      }
    } else {
      transferPayload.destination = {
        type: 'blockchain',
        address: destination_address,
        chain: 'ETH', // Default to Ethereum for USDC
      }
    }

    if (description) {
      transferPayload.description = description
    }

    console.log('Creating Circle transfer with payload:', transferPayload)

    // Create transfer with Circle
    const response = await fetch(`${baseUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${circleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferPayload),
    })

    console.log('Circle transfer response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Circle transfer error:', errorData)
      
      return new Response(
        JSON.stringify({
          error: 'Circle transfer failed',
          circle_error: errorData.code,
          circle_message: errorData.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const transferData = await response.json()
    console.log('Circle transfer created successfully:', transferData)

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
    console.error('Error processing Circle transfer:', error)
    
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