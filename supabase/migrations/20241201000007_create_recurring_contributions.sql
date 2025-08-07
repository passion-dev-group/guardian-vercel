-- Create recurring_contributions table for automated scheduling
CREATE TABLE IF NOT EXISTS recurring_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0-6 (Sunday-Saturday)
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31), -- 1-31
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_contribution_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of user and circle
  UNIQUE(user_id, circle_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_user_id ON recurring_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_circle_id ON recurring_contributions(circle_id);
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_is_active ON recurring_contributions(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_contributions_next_date ON recurring_contributions(next_contribution_date);

-- Enable Row Level Security
ALTER TABLE recurring_contributions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring contributions" ON recurring_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring contributions" ON recurring_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring contributions" ON recurring_contributions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring contributions" ON recurring_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_recurring_contributions_updated_at
  BEFORE UPDATE ON recurring_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_contributions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recurring_contributions IS 'Stores recurring contribution schedules for automated payments';
COMMENT ON COLUMN recurring_contributions.frequency IS 'Frequency of contributions: weekly, biweekly, or monthly';
COMMENT ON COLUMN recurring_contributions.day_of_week IS 'Day of week for weekly/biweekly contributions (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN recurring_contributions.day_of_month IS 'Day of month for monthly contributions (1-31)';
COMMENT ON COLUMN recurring_contributions.next_contribution_date IS 'Next scheduled contribution date'; 