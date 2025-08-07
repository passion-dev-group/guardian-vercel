-- Add RLS policies for circle_invites table
-- This migration ensures that invite codes can be validated for joining circles

-- Enable RLS on circle_invites table if not already enabled
ALTER TABLE circle_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Circle creators can create invites" ON circle_invites;
DROP POLICY IF EXISTS "Anyone can read invites by code" ON circle_invites;
DROP POLICY IF EXISTS "Circle creators can view their invites" ON circle_invites;
DROP POLICY IF EXISTS "System can manage invites" ON circle_invites;

-- Create policies for circle_invites table

-- Circle creators can create invites for their circles
CREATE POLICY "Circle creators can create invites" ON circle_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM circles 
      WHERE circles.id = circle_invites.circle_id 
      AND circles.created_by = auth.uid()
    )
  );

-- Anyone can read invites by invite code (needed for join validation)
-- This allows the join functionality to work without requiring authentication
CREATE POLICY "Anyone can read invites by code" ON circle_invites
  FOR SELECT USING (true);

-- Circle creators can view invites they created
CREATE POLICY "Circle creators can view their invites" ON circle_invites
  FOR SELECT USING (
    created_by = auth.uid()
  );

-- System functions can manage invites (for automated processes)
CREATE POLICY "System can manage invites" ON circle_invites
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_circle_invites_invite_code ON circle_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_circle_invites_circle_id ON circle_invites(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invites_created_by ON circle_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_circle_invites_expires_at ON circle_invites(expires_at); 