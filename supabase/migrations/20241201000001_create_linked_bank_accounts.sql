-- Create linked_bank_accounts table
CREATE TABLE IF NOT EXISTS linked_bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL,
  plaid_access_token TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_subtype TEXT NOT NULL,
  mask TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending_automatic_verification',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user and account
  UNIQUE(user_id, account_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_user_id ON linked_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_is_active ON linked_bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_plaid_item_id ON linked_bank_accounts(plaid_item_id);

-- Enable Row Level Security
ALTER TABLE linked_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own linked bank accounts" ON linked_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked bank accounts" ON linked_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked bank accounts" ON linked_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linked bank accounts" ON linked_bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_linked_bank_accounts_updated_at
  BEFORE UPDATE ON linked_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 