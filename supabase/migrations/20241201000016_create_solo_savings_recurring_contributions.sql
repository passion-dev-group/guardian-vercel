-- Create solo_savings_recurring_contributions table for automated solo savings
CREATE TABLE IF NOT EXISTS solo_savings_recurring_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES solo_savings_goals(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0-6 (Sunday-Saturday)
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- 1-31
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_contribution_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user and goal
  UNIQUE(user_id, goal_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_contributions_user_id ON solo_savings_recurring_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_contributions_goal_id ON solo_savings_recurring_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_contributions_is_active ON solo_savings_recurring_contributions(is_active);
CREATE INDEX IF NOT EXISTS idx_solo_savings_recurring_contributions_next_date ON solo_savings_recurring_contributions(next_contribution_date);

-- Enable Row Level Security
ALTER TABLE solo_savings_recurring_contributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own solo savings recurring contributions" ON solo_savings_recurring_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solo savings recurring contributions" ON solo_savings_recurring_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solo savings recurring contributions" ON solo_savings_recurring_contributions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solo savings recurring contributions" ON solo_savings_recurring_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_solo_savings_recurring_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_solo_savings_recurring_contributions_updated_at
  BEFORE UPDATE ON solo_savings_recurring_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_solo_savings_recurring_contributions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE solo_savings_recurring_contributions IS 'Stores recurring contribution schedules for solo savings goals';
COMMENT ON COLUMN solo_savings_recurring_contributions.frequency IS 'Frequency of contributions: weekly, biweekly, or monthly';
COMMENT ON COLUMN solo_savings_recurring_contributions.day_of_week IS 'Day of week for weekly/biweekly contributions (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN solo_savings_recurring_contributions.day_of_month IS 'Day of month for monthly contributions (1-31)';
COMMENT ON COLUMN solo_savings_recurring_contributions.next_contribution_date IS 'Next scheduled contribution date';
