-- Add test_clock_id columns to recurring tables for Plaid sandbox test clocks

-- recurring_contributions (circle)
ALTER TABLE IF EXISTS recurring_contributions
ADD COLUMN IF NOT EXISTS test_clock_id TEXT;

CREATE INDEX IF NOT EXISTS idx_recurring_contributions_test_clock_id
  ON recurring_contributions(test_clock_id);

-- solo_savings_recurring_contributions (solo goals)
ALTER TABLE IF EXISTS solo_savings_recurring_contributions
ADD COLUMN IF NOT EXISTS test_clock_id TEXT;

CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_test_clock_id
  ON solo_savings_recurring_contributions(test_clock_id);

COMMENT ON COLUMN recurring_contributions.test_clock_id IS 'Plaid sandbox test clock id used for this recurring transfer';
COMMENT ON COLUMN solo_savings_recurring_contributions.test_clock_id IS 'Plaid sandbox test clock id used for this recurring transfer';


