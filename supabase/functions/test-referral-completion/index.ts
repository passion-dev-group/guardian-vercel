import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { referralCode, userId } = await req.json()

    if (!referralCode || !userId) {
      throw new Error('Missing referralCode or userId')
    }

    // First, check if the referral code exists
    const { data: referralCheck, error: checkError } = await supabaseClient
      .from('referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .single()

    console.log('Referral check result:', { referralCheck, checkError })

    if (checkError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Referral code not found',
          details: checkError.message,
          referralCode
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Now try the RPC function
    const { data: rpcResult, error: rpcError } = await supabaseClient
      .rpc('process_referral_completion', {
        p_referral_code: referralCode,
        p_referred_user_id: userId,
        p_completion_type: 'signup'
      })

    console.log('RPC result:', { rpcResult, rpcError })

    return new Response(
      JSON.stringify({
        success: true,
        referralExists: !!referralCheck,
        referralData: referralCheck,
        rpcResult,
        rpcError: rpcError?.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Test function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
