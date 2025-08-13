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
      user_id,
      circle_id,
      amount,
      account_id,
      access_token,
      description
    } = await req.json()

    if (!user_id || !circle_id || !amount || !account_id || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, circle_id, amount, account_id, access_token' }),
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

    // Verify the user is a member of the circle
    const { data: membership, error: membershipError } = await supabase
      .from('circle_members')
      .select('*')
      .eq('circle_id', circle_id)
      .eq('user_id', user_id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User is not a member of this circle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
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

    // Verify the account belongs to the user
    const { data: linkedAccount, error: accountError } = await supabase
      .from('linked_bank_accounts')
      .select('*')
      .eq('user_id', user_id)
      .eq('account_id', account_id)
      .eq('is_active', true)
      .single()

    if (accountError || !linkedAccount) {
      return new Response(
        JSON.stringify({ error: 'Bank account not found or not linked to user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get account balance to verify sufficient funds
    try {
      const balanceResponse = await plaidClient.accountsBalanceGet({
        access_token: access_token,
      })

      const account = balanceResponse.data.accounts.find(acc => acc.account_id === account_id)
      if (!account) {
        return new Response(
          JSON.stringify({ error: 'Account not found in Plaid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      const availableBalance = account.balances.available || account.balances.current || 0
      if (availableBalance < amount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient funds in account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    } catch (plaidError) {
      console.error('Error getting account balance:', plaidError)
      // In production, you might want to be more strict about this
      // For now, we'll continue and let the payment processor handle insufficient funds
    }

    // Create the transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('circle_transactions')
      .insert({
        circle_id: circle_id,
        user_id: user_id,
        amount: amount,
        type: 'contribution',
        status: 'pending',
        transaction_date: new Date().toISOString(),
        description: description || `Contribution to ${circle.name}`,
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get user's profile information for transfer
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile for transfer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get user's email from auth.users if not in profile
    let userEmail = userProfile.email;
    if (!userEmail) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(user_id);
        if (!authError && user) {
          userEmail = user.email;
        }
      } catch (authError) {
        console.error('Error fetching user email from auth:', authError);
      }
    }

    // Validate required profile data
    if (!userProfile.display_name) {
      console.error('User profile missing display_name:', userProfile);
      return new Response(
        JSON.stringify({ error: 'User profile is incomplete. Please complete your profile before making payments.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!userEmail) {
      console.error('User has no email address:', userProfile);
      return new Response(
        JSON.stringify({ error: 'User email address is required for payment processing.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get phone number from user's profile (primary source for payment processing)
    let userPhoneNumber = userProfile.phone;

    if (!userPhoneNumber) {
      console.error('User profile missing phone number');
      return new Response(
        JSON.stringify({ error: 'Phone number is required for payment processing. Please update your profile with a phone number.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create transfer authorization
    const authorizationRequest = {
      access_token: access_token,
      account_id: account_id,
      type: 'debit' as const, // Debit to take money FROM the user
      network: 'ach' as const,
      amount: amount.toFixed(2),
      ach_class: 'ppd' as const, // Personal account
      user: {
        legal_name: userProfile.display_name || 'Unknown User',
        phone_number: userPhoneNumber, // Use phone number from user profile
        email_address: userEmail || 'user@example.com',
        address: {
          street: userProfile.address_street || undefined,
          city: userProfile.address_city || undefined,
          region: userProfile.address_state || undefined, // Plaid expects 'region' not 'state'
          postal_code: userProfile.address_zip || undefined, // Plaid expects 'postal_code' not 'zip'
          country: userProfile.address_country || 'US',
        },
      },
    }

    // Remove undefined fields to avoid Plaid API errors
    // Note: phone_number is always included from user profile
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

    console.log('Creating transfer authorization for contribution:', {
      ...authorizationRequest,
      access_token: '***REDACTED***', // Don't log sensitive data
      user: {
        ...authorizationRequest.user,
        phone_number: authorizationRequest.user.phone_number ? '***REDACTED***' : undefined
      }
    })

    let authorization: any;
    let transfer: any;
    let paymentSuccess = false;

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
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({
            success: false,
            transaction_id: transaction.id,
            error: 'Transfer authorization denied',
            decision: authorization.decision,
            decision_rationale: authorization.decision_rationale,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Create the actual transfer using the correct Plaid Transfer API
      // Ensure description meets Plaid's requirements: non-empty, max 15 characters
      let transferDescription = `Circle: ${circle.name}`.substring(0, 15);
      if (!transferDescription.trim()) {
        transferDescription = 'Circle Contrib'; // Fallback if circle name is empty
      }
      
      const transferRequest = {
        access_token: access_token,
        account_id: account_id,
        authorization_id: authorization.id,
        amount: amount.toFixed(2),
        description: transferDescription,
      }

      console.log('Creating transfer for contribution:', transferRequest)

      const transferResponse = await plaidClient.transferCreate(transferRequest)
      transfer = transferResponse.data.transfer

      console.log('Transfer created successfully:', transfer)

      // Update transaction with transfer details
      await supabase
        .from('circle_transactions')
        .update({
          status: 'completed',
          plaid_transfer_id: transfer.id,
          plaid_authorization_id: authorization.id,
        })
        .eq('id', transaction.id)

      paymentSuccess = true

    } catch (plaidError) {
      console.error('Plaid transfer error:', plaidError)

      // Update transaction status to failed
      await supabase
        .from('circle_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: transaction.id,
          error: 'Plaid transfer failed',
          plaid_error: plaidError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (paymentSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          message: 'Payment processed successfully',
          amount: amount,
          plaid_transfer_id: transfer.id,
          plaid_authorization_id: authorization.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error processing circle payment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 