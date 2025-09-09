-- Add plaid_recurring_transfer_id column to recurring_contributions table
ALTER TABLE recurring_contributions 
ADD COLUMN IF NOT EXISTS plaid_recurring_transfer_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_plaid_id 
ON recurring_contributions(plaid_recurring_transfer_id);

-- Add comment for documentation
COMMENT ON COLUMN recurring_contributions.plaid_recurring_transfer_id 
IS 'ID of the recurring transfer in Plaid';
