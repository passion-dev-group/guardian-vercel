-- Create solo_savings_transactions table to track all transactions for solo savings goals
CREATE TABLE IF NOT EXISTS solo_savings_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES solo_savings_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recurring_contribution', 'manual_deposit', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_goal_id ON solo_savings_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_user_id ON solo_savings_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_type ON solo_savings_transactions(type);
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_status ON solo_savings_transactions(status);
CREATE INDEX IF NOT EXISTS idx_solo_savings_transactions_date ON solo_savings_transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE solo_savings_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own solo savings transactions" ON solo_savings_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solo savings transactions" ON solo_savings_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solo savings transactions" ON solo_savings_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_solo_savings_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_solo_savings_transactions_updated_at
  BEFORE UPDATE ON solo_savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_solo_savings_transactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE solo_savings_transactions IS 'Stores all transactions for solo savings goals';
COMMENT ON COLUMN solo_savings_transactions.type IS 'Type of transaction: recurring_contribution, manual_deposit, or adjustment';
COMMENT ON COLUMN solo_savings_transactions.status IS 'Status of the transaction: pending, completed, failed, or cancelled';
COMMENT ON COLUMN solo_savings_transactions.metadata IS 'Additional transaction metadata as JSON';
