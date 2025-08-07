-- Add Plaid transfer fields to circle_transactions table
ALTER TABLE circle_transactions 
ADD COLUMN IF NOT EXISTS plaid_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS plaid_authorization_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_circle_transactions_plaid_transfer_id ON circle_transactions(plaid_transfer_id);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_plaid_authorization_id ON circle_transactions(plaid_authorization_id);

-- Add comments for documentation
COMMENT ON COLUMN circle_transactions.plaid_transfer_id IS 'Plaid transfer ID for tracking ACH transfers';
COMMENT ON COLUMN circle_transactions.plaid_authorization_id IS 'Plaid authorization ID for transfer authorization'; 