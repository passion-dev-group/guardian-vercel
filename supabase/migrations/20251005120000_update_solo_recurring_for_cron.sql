-- Update solo_savings_recurring_contributions for cron-based daily transfers
-- Since Plaid doesn't support daily recurring transfers, we use a cron job instead

-- Make plaid_recurring_transfer_id nullable (not used for daily transfers)
ALTER TABLE solo_savings_recurring_contributions
ALTER COLUMN plaid_recurring_transfer_id DROP NOT NULL;

-- Add linked_bank_account_id for cron job to know which account to debit
ALTER TABLE solo_savings_recurring_contributions
ADD COLUMN IF NOT EXISTS linked_bank_account_id UUID REFERENCES linked_bank_accounts(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_solo_recurring_bank_account 
ON solo_savings_recurring_contributions(linked_bank_account_id);

-- Add index for active contributions lookup
CREATE INDEX IF NOT EXISTS idx_solo_recurring_active 
ON solo_savings_recurring_contributions(is_active) 
WHERE is_active = true;

-- Update comments
COMMENT ON COLUMN solo_savings_recurring_contributions.plaid_recurring_transfer_id IS 'ID of the recurring transfer in Plaid (nullable for daily transfers which use cron)';
COMMENT ON COLUMN solo_savings_recurring_contributions.linked_bank_account_id IS 'Bank account to debit for daily transfers (used by cron job)';
COMMENT ON COLUMN solo_savings_recurring_contributions.test_clock_id IS 'Plaid test clock ID for sandbox daily transfers (used by cron job)';

