-- Add RLS policies for circle_transactions table
-- This migration ensures that circle transaction operations work properly

-- Enable RLS on circle_transactions table if not already enabled
ALTER TABLE circle_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their circle transactions" ON circle_transactions;
DROP POLICY IF EXISTS "Users can create their circle transactions" ON circle_transactions;
DROP POLICY IF EXISTS "Service role can manage circle transactions" ON circle_transactions;
DROP POLICY IF EXISTS "Circle members can view transactions" ON circle_transactions;

-- Create policies for circle_transactions table

-- Users can view transactions for circles they belong to
CREATE POLICY "Circle members can view transactions" ON circle_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_transactions.circle_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can create transactions for circles they belong to
CREATE POLICY "Users can create their circle transactions" ON circle_transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_transactions.circle_id
      AND cm.user_id = auth.uid()
    )
  );

-- Service role can manage all circle transactions (for automated processes like webhooks)
-- This is crucial for the payment processing functions to work
-- Allow all operations when using service role key (bypasses RLS for service role)
CREATE POLICY "Service role can manage circle transactions" ON circle_transactions
  FOR ALL TO service_role USING (true);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_circle_transactions_circle_id ON circle_transactions(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_user_id ON circle_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_status ON circle_transactions(status);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_type ON circle_transactions(type);
CREATE INDEX IF NOT EXISTS idx_circle_transactions_date ON circle_transactions(transaction_date);
