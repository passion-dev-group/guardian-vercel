import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const { access_token, include_details } = await req.json()

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'access_token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID')!,
          'PLAID-SECRET': Deno.env.get('PLAID_SECRET')!,
        },
      },
    })

    const plaidClient = new PlaidApi(configuration)

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: access_token,
    })

    let accounts = accountsResponse.data.accounts;

    // If include_details is true, try to get additional account information
    if (include_details) {
      try {
        // Get item information which might include phone numbers
        const itemResponse = await plaidClient.itemGet({
          access_token: access_token,
        });

        // Get identity information if available
        let identityInfo = null;
        try {
          const identityResponse = await plaidClient.identityGet({
            access_token: access_token,
          });
          identityInfo = identityResponse.data;
        } catch (identityError) {
          console.log('Could not get identity info:', identityError);
        }

        // Enhance accounts with additional information
        accounts = accounts.map(account => ({
          ...account,
          // Add phone number from identity if available
          phone_number: identityInfo?.accounts?.find(acc => acc.account_id === account.account_id)?.phone_numbers?.[0] || null,
          // Add item information
          item_id: itemResponse.data.item.item_id,
          institution_id: itemResponse.data.item.institution_id,
        }));
      } catch (detailsError) {
        console.log('Could not get detailed account info:', detailsError);
        // Continue with basic account info if detailed info fails
      }
    }

    return new Response(
      JSON.stringify({
        accounts: accounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting accounts:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 