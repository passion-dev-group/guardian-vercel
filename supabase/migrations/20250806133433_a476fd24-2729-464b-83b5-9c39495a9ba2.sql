-- Update linked_bank_accounts table to support Circle wallets
ALTER TABLE public.linked_bank_accounts 
ADD COLUMN circle_wallet_id TEXT,
ADD COLUMN circle_user_id TEXT,
ADD COLUMN wallet_verification_status TEXT DEFAULT 'pending',
ADD COLUMN wallet_type TEXT DEFAULT 'circle';

-- Create indexes for better performance
CREATE INDEX idx_linked_bank_accounts_circle_wallet_id ON public.linked_bank_accounts(circle_wallet_id);
CREATE INDEX idx_linked_bank_accounts_circle_user_id ON public.linked_bank_accounts(circle_user_id);

-- Update the verification_status to include Circle-specific statuses
COMMENT ON COLUMN public.linked_bank_accounts.wallet_verification_status IS 'Circle wallet verification status: pending, verified, failed';
COMMENT ON COLUMN public.linked_bank_accounts.wallet_type IS 'Type of wallet: plaid, circle';