# Plaid Integration Setup Guide

This guide will help you set up Plaid integration for bank account linking in the MiTurn application.

## Prerequisites

1. A Plaid account (sign up at [plaid.com](https://plaid.com))
2. Supabase project with edge functions enabled
3. Node.js and npm installed

## Step 1: Plaid Dashboard Setup

1. **Create a Plaid Account**
   - Go to [plaid.com](https://plaid.com) and sign up for a developer account
   - Complete the onboarding process

2. **Get Your API Keys**
   - Navigate to the Plaid Dashboard
   - Go to "Team Settings" > "Keys"
   - Copy your `PLAID_CLIENT_ID` and `PLAID_SECRET`
   - Note: Use the "Sandbox" keys for development

3. **Configure Products**
   - In the Plaid Dashboard, go to "Products"
   - Enable "Auth" and "Transactions" products
   - These are required for bank account linking

## Step 2: Environment Variables

Add the following environment variables to your Supabase project:

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # or 'development' for testing

# Supabase Configuration (should already be set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Setting Environment Variables in Supabase

1. Go to your Supabase Dashboard
2. Navigate to "Settings" > "Edge Functions"
3. Add each environment variable

## Step 3: Database Setup

Run the database migration to create the `linked_bank_accounts` table:

```sql
-- This migration is already included in the project
-- File: supabase/migrations/20241201000001_create_linked_bank_accounts.sql
```

To apply the migration:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in the Supabase SQL Editor
```

## Step 4: Deploy Edge Functions

Deploy the Plaid edge functions to Supabase:

```bash
# Deploy all functions
supabase functions deploy plaid-create-link-token
supabase functions deploy plaid-exchange-token
supabase functions deploy plaid-accounts
supabase functions deploy plaid-balances
```

## Step 5: Frontend Configuration

The frontend is already configured to use the Plaid integration. Key components:

- `src/hooks/usePlaidLink.ts` - Manages Plaid Link flow
- `src/lib/plaid.ts` - Plaid service for API calls
- `src/components/bank-linking/PlaidLinkButton.tsx` - UI component for bank linking
- `src/pages/LinkBank.tsx` - Main bank linking page

## Step 6: Testing the Integration

### Development Mode
The application includes mock implementations for development:

- `plaidService.mockCreateLinkToken()` - Creates mock link tokens
- `plaidService.mockExchangePublicToken()` - Simulates token exchange
- `plaidService.mockGetAccounts()` - Returns mock account data

### Production Mode
In production, the app will use real Plaid API calls through the edge functions.

## Step 7: Sandbox Testing

Plaid provides sandbox credentials for testing:

**Bank Credentials:**
- Username: `user_good`
- Password: `pass_good`

**Institutions:**
- Chase Bank
- Bank of America
- Wells Fargo
- And many more

## API Endpoints

The following edge functions are deployed:

1. **`/plaid-create-link-token`** - Creates Plaid Link tokens
2. **`/plaid-exchange-token`** - Exchanges public tokens for access tokens
3. **`/plaid-accounts`** - Retrieves account information
4. **`/plaid-balances`** - Gets account balances

## Security Considerations

1. **Row Level Security (RLS)** - Database tables are protected with RLS policies
2. **Environment Variables** - Sensitive keys are stored as environment variables
3. **Token Management** - Access tokens are encrypted and stored securely
4. **CORS Protection** - Edge functions include proper CORS headers

## Troubleshooting

### Common Issues

1. **"Link token creation failed"**
   - Check your Plaid API keys
   - Verify environment variables are set correctly
   - Ensure you're using the correct Plaid environment

2. **"User not found"**
   - Verify the user exists in your Supabase auth
   - Check that the user_id is being passed correctly

3. **"CORS errors"**
   - Ensure edge functions are deployed with correct CORS headers
   - Check that your frontend URL is allowed

4. **"Database errors"**
   - Verify the migration has been applied
   - Check RLS policies are configured correctly

### Debug Mode

Enable debug logging by setting:

```bash
PLAID_DEBUG=true
```

This will log detailed information about Plaid API calls.

## Production Deployment

When deploying to production:

1. **Update Plaid Environment**
   - Change `PLAID_ENV` from `sandbox` to `development` or `production`
   - Update your Plaid API keys to production keys

2. **Update CORS Settings**
   - Configure CORS headers to allow only your production domain

3. **Enable Monitoring**
   - Set up error tracking for edge functions
   - Monitor Plaid API usage and limits

## Support

For additional help:

- [Plaid Documentation](https://plaid.com/docs/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [MiTurn Project Issues](https://github.com/your-repo/issues)

## License

This integration is part of the MiTurn project and follows the same license terms. 