-- Fix RLS policies for linked_bank_accounts to allow service role access for webhooks
-- This allows the webhook function to look up accounts by plaid_item_id

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own linked bank accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own linked bank accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "Users can update their own linked bank accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own linked bank accounts" ON linked_bank_accounts;

-- Create new policies that allow both user access and service role access
CREATE POLICY "Users can view their own linked bank accounts" ON linked_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can view all linked bank accounts" ON linked_bank_accounts
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Users can insert their own linked bank accounts" ON linked_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked bank accounts" ON linked_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked bank accounts" ON linked_bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment explaining the service role policy
COMMENT ON POLICY "Service role can view all linked bank accounts" ON linked_bank_accounts IS 'Allows webhook functions to look up accounts by plaid_item_id for transaction processing';
