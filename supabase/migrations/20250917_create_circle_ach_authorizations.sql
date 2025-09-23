-- Create table to store member ACH authorization consent for circles
CREATE TABLE IF NOT EXISTS circle_ach_authorizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  linked_bank_account_id UUID NULL REFERENCES linked_bank_accounts(id) ON DELETE SET NULL,
  plaid_account_id TEXT NOT NULL,
  plaid_authorization_id TEXT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','yearly')),
  consent_text_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  UNIQUE(user_id, circle_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_ach_auth_user ON circle_ach_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_ach_auth_circle ON circle_ach_authorizations(circle_id);

ALTER TABLE circle_ach_authorizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own ACH authorizations" ON circle_ach_authorizations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can manage their own ACH authorizations" ON circle_ach_authorizations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE circle_ach_authorizations IS 'Stores member consent for recurring ACH debits per circle.';
COMMENT ON COLUMN circle_ach_authorizations.consent_text_hash IS 'Hash of the NACHA consent text presented to user.';

