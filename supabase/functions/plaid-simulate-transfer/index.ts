import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { transfer_id, event_type } = await req.json()

    if (!transfer_id || !event_type) {
      return new Response(JSON.stringify({ error: 'transfer_id and event_type are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    const plaidClient = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
            'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
          },
        },
      })
    )

    // Only works in sandbox
    const env = Deno.env.get('PLAID_ENV') || 'sandbox'
    if (env !== 'sandbox') {
      return new Response(JSON.stringify({ error: 'Simulation only available in sandbox' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // event_type examples: posted, pending, cancelled, failed, returned
    const simulate = await plaidClient.sandboxTransferSimulate({
      transfer_id,
      event_type,
    })

    return new Response(JSON.stringify({ success: true, result: simulate.data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    console.error('Error simulating transfer:', error)
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})


