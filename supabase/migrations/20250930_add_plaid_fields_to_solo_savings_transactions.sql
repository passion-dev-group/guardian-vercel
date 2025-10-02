-- Add Plaid transfer fields to solo_savings_transactions table
-- This makes it consistent with circle_transactions structure

ALTER TABLE solo_savings_transactions 
ADD COLUMN IF NOT EXISTS plaid_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS plaid_authorization_id TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_plaid_transfer_id ON solo_savings_transactions(plaid_transfer_id);
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_plaid_authorization_id ON solo_savings_transactions(plaid_authorization_id);

-- Add comments for documentation
COMMENT ON COLUMN solo_savings_transactions.plaid_transfer_id IS 'Plaid transfer ID for tracking ACH transfers';
COMMENT ON COLUMN solo_savings_transactions.plaid_authorization_id IS 'Plaid authorization ID for transfer authorization';
COMMENT ON COLUMN solo_savings_transactions.processed_at IS 'Timestamp when the transaction was processed by Plaid';

