-- Add phone number field to linked_bank_accounts table for payment processing
ALTER TABLE linked_bank_accounts 
ADD COLUMN phone_number TEXT;

-- Add comment to document the new field
COMMENT ON COLUMN linked_bank_accounts.phone_number IS 'Phone number associated with this bank account for payment processing';

-- Add index for phone number queries
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_phone ON linked_bank_accounts(phone_number);
