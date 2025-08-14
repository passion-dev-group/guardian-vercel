-- Add metadata column to circle_transactions table for storing webhook and transfer data
ALTER TABLE circle_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_circle_transactions_metadata ON circle_transactions USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN circle_transactions.metadata IS 'JSON metadata for storing webhook data, transfer details, and other transaction information';
