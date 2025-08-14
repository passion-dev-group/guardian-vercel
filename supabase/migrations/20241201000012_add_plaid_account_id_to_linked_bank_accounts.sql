-- Add plaid_account_id field to linked_bank_accounts table for Plaid API integration
ALTER TABLE linked_bank_accounts 
ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

-- Add comment to document the new field
COMMENT ON COLUMN linked_bank_accounts.plaid_account_id IS 'Plaid account ID for this bank account';

-- Add index for plaid_account_id queries
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_plaid_account_id ON linked_bank_accounts(plaid_account_id);

-- Update existing records to populate plaid_account_id from account_id if it's empty
UPDATE linked_bank_accounts 
SET plaid_account_id = account_id 
WHERE plaid_account_id IS NULL;
