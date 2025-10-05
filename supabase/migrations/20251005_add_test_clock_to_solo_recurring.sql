-- Add test_clock_id to solo_savings_recurring_contributions for sandbox testing
ALTER TABLE solo_savings_recurring_contributions 
ADD COLUMN IF NOT EXISTS test_clock_id TEXT;

-- Add index for test_clock_id
CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_contributions_test_clock_id 
ON solo_savings_recurring_contributions(test_clock_id);

-- Add comment
COMMENT ON COLUMN solo_savings_recurring_contributions.test_clock_id IS 'Plaid test clock ID for sandbox recurring transfers';

