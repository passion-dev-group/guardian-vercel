-- Drop existing objects if they exist to avoid conflicts
DROP TABLE IF EXISTS solo_savings_recurring_contributions CASCADE;
DROP FUNCTION IF EXISTS update_solo_savings_recurring_contributions_updated_at();

-- Create solo_savings_recurring_contributions table
CREATE TABLE solo_savings_recurring_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES solo_savings_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  plaid_recurring_transfer_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_solo_savings_recurring_contributions_goal_id ON solo_savings_recurring_contributions(goal_id);
CREATE INDEX idx_solo_savings_recurring_contributions_user_id ON solo_savings_recurring_contributions(user_id);
CREATE INDEX idx_solo_savings_recurring_contributions_plaid_id ON solo_savings_recurring_contributions(plaid_recurring_transfer_id);

-- Enable Row Level Security
ALTER TABLE solo_savings_recurring_contributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own recurring contributions" ON solo_savings_recurring_contributions;
  DROP POLICY IF EXISTS "Users can insert their own recurring contributions" ON solo_savings_recurring_contributions;
  DROP POLICY IF EXISTS "Users can update their own recurring contributions" ON solo_savings_recurring_contributions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view their own recurring contributions" ON solo_savings_recurring_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring contributions" ON solo_savings_recurring_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring contributions" ON solo_savings_recurring_contributions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_solo_savings_recurring_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_solo_savings_recurring_contributions_updated_at ON solo_savings_recurring_contributions;
CREATE TRIGGER update_solo_savings_recurring_contributions_updated_at
  BEFORE UPDATE ON solo_savings_recurring_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_solo_savings_recurring_contributions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE solo_savings_recurring_contributions IS 'Stores recurring contribution settings for solo savings goals';
COMMENT ON COLUMN solo_savings_recurring_contributions.frequency IS 'Frequency of recurring contributions: daily, weekly, biweekly, monthly, quarterly, yearly';
COMMENT ON COLUMN solo_savings_recurring_contributions.day_of_week IS 'Day of week (0-6, Sunday-Saturday) for weekly/biweekly contributions';
COMMENT ON COLUMN solo_savings_recurring_contributions.day_of_month IS 'Day of month (1-31) for monthly/quarterly/yearly contributions';
COMMENT ON COLUMN solo_savings_recurring_contributions.plaid_recurring_transfer_id IS 'ID of the recurring transfer in Plaid';

-- Note: Edge Functions permissions are handled automatically by Supabase
-- This migration focuses on the database schema changes only