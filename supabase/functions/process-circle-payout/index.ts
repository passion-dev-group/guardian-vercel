import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0'

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
    const {
      circle_id,
      member_id,
      admin_user_id,
      payout_amount
    } = await req.json()

    if (!circle_id || !member_id || !admin_user_id || !payout_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: circle_id, member_id, admin_user_id, payout_amount' }),
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

    // Verify the admin user is actually an admin of this circle
    const { data: adminMembership, error: adminError } = await supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circle_id)
      .eq('user_id', admin_user_id)
      .eq('is_admin', true)
      .single()

    if (adminError || !adminMembership) {
      return new Response(
        JSON.stringify({ error: 'User is not an admin of this circle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get the member to be paid out
    const { data: member, error: memberError } = await supabase
      .from('circle_members')
      .select('*')
      .eq('id', member_id)
      .eq('circle_id', circle_id)
      .single()

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'Member not found in this circle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get circle details
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('*')
      .eq('id', circle_id)
      .single()

    if (circleError || !circle) {
      return new Response(
        JSON.stringify({ error: 'Circle not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Calculate total pool amount from all contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('circle_transactions')
      .select('amount')
      .eq('circle_id', circle_id)
      .eq('type', 'contribution')
      .eq('status', 'completed')

    if (contributionsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to calculate pool amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const totalPool = contributions?.reduce((sum, tx) => sum + tx.amount, 0) || 0

    // Verify payout amount doesn't exceed pool
    if (payout_amount > totalPool) {
      return new Response(
        JSON.stringify({ error: 'Payout amount exceeds available pool' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get member's linked bank account for payout
    const { data: linkedAccount, error: accountError } = await supabase
      .from('linked_bank_accounts')
      .select('*')
      .eq('user_id', member.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (accountError || !linkedAccount) {
      return new Response(
        JSON.stringify({ error: 'Member has no linked bank account for payout' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }



    // Create the payout transaction record
    const { data: payoutTransaction, error: transactionError } = await supabase
      .from('circle_transactions')
      .insert({
        circle_id: circle_id,
        user_id: member.user_id,
        amount: payout_amount,
        type: 'payout',
        status: 'pending',
        transaction_date: new Date().toISOString(),
        description: `Payout to ${member.user_id} from ${circle.name}`,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating payout transaction record:', transactionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create payout transaction record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get member's profile information for transfer
    const { data: memberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', member.user_id)
      .single()

    if (profileError || !memberProfile) {
      console.error('Error fetching member profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch member profile for transfer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Create transfer authorization
    const authorizationRequest = {
      access_token: linkedAccount.plaid_access_token,
      account_id: linkedAccount.plaid_account_id,
      type: 'credit' as const, // Credit to send money TO the member
      network: 'ach' as const,
      amount: payout_amount.toFixed(2),
      ach_class: 'ppd' as const, // Personal account
      user: {
        legal_name: memberProfile.display_name || 'Unknown User',
        phone_number: memberProfile.phone || '+15551234567',
        email_address: memberProfile.email || 'user@example.com',
        address: {
          street: memberProfile.address_street || undefined,
          city: memberProfile.address_city || undefined,
          region: memberProfile.address_state || undefined, // Plaid expects 'region' not 'state'
          postal_code: memberProfile.address_zip || undefined, // Plaid expects 'postal_code' not 'zip'
          country: memberProfile.address_country || 'US',
        },
      },
    }
    if (!authorizationRequest.user.address.street) {
      delete authorizationRequest.user.address.street;
    }
    if (!authorizationRequest.user.address.city) {
      delete authorizationRequest.user.address.city;
    }
    if (!authorizationRequest.user.address.region) {
      delete authorizationRequest.user.address.region;
    }
    if (!authorizationRequest.user.address.postal_code) {
      delete authorizationRequest.user.address.postal_code;
    }

    console.log('Creating transfer authorization for payout:', authorizationRequest)

    let authorization: any;
    let transfer: any;
    let payoutSuccess = false;

    try {
      // Create authorization
      const authResponse = await plaidClient.transferAuthorizationCreate(authorizationRequest)
      authorization = authResponse.data.authorization

      console.log('Transfer authorization created:', authorization)

      // Check if authorization was approved
      if (authorization.decision !== 'approved') {
        console.error('Transfer authorization denied:', authorization.decision_rationale)
        await supabase
          .from('circle_transactions')
          .update({ status: 'failed' })
          .eq('id', payoutTransaction.id)

        return new Response(
          JSON.stringify({
            success: false,
            transaction_id: payoutTransaction.id,
            error: 'Transfer authorization denied',
            decision: authorization.decision,
            decision_rationale: authorization.decision_rationale,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      let transferDescription = `Payout from ${circle.name}`.substring(0, 15);
      if (!transferDescription.trim()) {
        transferDescription = 'Circle Payout'; // Fallback if circle name is empty
      }

      // Create the actual transfer
      const transferRequest = {
        access_token: linkedAccount.plaid_access_token,
        account_id: linkedAccount.plaid_account_id,
        authorization_id: authorization.id,
        amount: payout_amount.toFixed(2),
        description: transferDescription,
      }

      console.log('Creating transfer for payout:', transferRequest)

      const transferResponse = await plaidClient.transferCreate(transferRequest)
      const transfer = transferResponse.data.transfer

      console.log('Transfer created successfully:', transfer)

      // Update transaction with transfer details
      await supabase
        .from('circle_transactions')
        .update({
          status: 'completed',
          plaid_transfer_id: transfer.id,
          plaid_authorization_id: authorization.id,
        })
        .eq('id', payoutTransaction.id)

      payoutSuccess = true

    } catch (plaidError) {
      console.error('Plaid transfer error:', plaidError)

      // Update transaction status to failed
      await supabase
        .from('circle_transactions')
        .update({ status: 'failed' })
        .eq('id', payoutTransaction.id)

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: payoutTransaction.id,
          error: 'Plaid transfer failed',
          plaid_error: plaidError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (payoutSuccess) {
      console.log('Processing successful payout for member:', member.user_id, 'amount:', payout_amount)

      // Update transaction status to completed
      const { error: updateError } = await supabase
        .from('circle_transactions')
        .update({
          status: 'completed',
        })
        .eq('id', payoutTransaction.id)

      if (updateError) {
        console.error('Error updating transaction status:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction status' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Update member's payout position and next payout date
      const { data: allMembers } = await supabase
        .from('circle_members')
        .select('payout_position')
        .eq('circle_id', circle_id)
        .not('payout_position', 'is', null)
        .order('payout_position', { ascending: true })

      const maxPosition = allMembers?.reduce((max, m) => Math.max(max, m.payout_position || 0), 0) || 0
      const nextPosition = (member.payout_position || 0) + 1

      // Calculate next payout date based on frequency
      const nextPayoutDate = new Date()
      if (circle.frequency === 'weekly') {
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 7)
      } else if (circle.frequency === 'biweekly') {
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 14)
      } else {
        nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1)
      }

      // Update member's payout position (cycle back to 1 if at max)
      const newPosition = nextPosition > maxPosition ? 1 : nextPosition

      const { error: memberUpdateError } = await supabase
        .from('circle_members')
        .update({
          payout_position: newPosition,
          next_payout_date: newPosition === 1 ? nextPayoutDate.toISOString() : null,
        })
        .eq('id', member_id)

      if (memberUpdateError) {
        console.error('Error updating member position:', memberUpdateError)
        // Don't fail the payout, just log the error
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: payoutTransaction.id,
          message: 'Payout processed successfully',
          amount: payout_amount,
          new_payout_position: newPosition,
          next_payout_date: newPosition === 1 ? nextPayoutDate.toISOString() : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Update transaction status to failed
      await supabase
        .from('circle_transactions')
        .update({
          status: 'failed',
        })
        .eq('id', payoutTransaction.id)

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: payoutTransaction.id,
          error: 'Payout processing failed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing circle payout:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 