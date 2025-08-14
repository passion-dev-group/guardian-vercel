-- Add missing Plaid integration fields to existing circle_transactions table
ALTER TABLE circle_transactions 
ADD COLUMN IF NOT EXISTS plaid_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS plaid_authorization_id TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add metadata column if it doesn't exist
ALTER TABLE circle_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_circle_transactions_plaid_transfer_id ON circle_transactions(plaid_transfer_id);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_plaid_authorization_id ON circle_transactions(plaid_authorization_id);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_metadata ON circle_transactions USING GIN (metadata);

-- Add comments for documentation
COMMENT ON COLUMN circle_transactions.plaid_transfer_id IS 'Plaid transfer ID for tracking ACH transfers';
COMMENT ON COLUMN circle_transactions.plaid_authorization_id IS 'Plaid authorization ID for transfer authorization';
COMMENT ON COLUMN circle_transactions.metadata IS 'JSON metadata for storing webhook data, transfer details, and other transaction information';
COMMENT ON COLUMN circle_transactions.processed_at IS 'Timestamp when the transaction was processed by Plaid';
