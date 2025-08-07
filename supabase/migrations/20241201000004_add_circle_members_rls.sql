-- Add RLS policies for circle_members table
-- This migration ensures that users can view members of circles they belong to

-- Enable RLS on circle_members table if not already enabled
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view members of their circles" ON circle_members;
DROP POLICY IF EXISTS "Users can join circles" ON circle_members;
DROP POLICY IF EXISTS "Circle admins can manage members" ON circle_members;
DROP POLICY IF EXISTS "System can manage members" ON circle_members;

-- Create policies for circle_members table

-- Users can view members of circles they belong to
CREATE POLICY "Users can view members of their circles" ON circle_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
    )
  );

-- Users can join circles (insert themselves as members)
CREATE POLICY "Users can join circles" ON circle_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Circle admins can manage members (update/delete)
CREATE POLICY "Circle admins can manage members" ON circle_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = true
    )
  );

-- Circle admins can delete members
CREATE POLICY "Circle admins can delete members" ON circle_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = true
    )
  );

-- System functions can manage members (for automated processes)
CREATE POLICY "System can manage members" ON circle_members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_is_admin ON circle_members(is_admin);
CREATE INDEX IF NOT EXISTS idx_circle_members_payout_position ON circle_members(payout_position); 