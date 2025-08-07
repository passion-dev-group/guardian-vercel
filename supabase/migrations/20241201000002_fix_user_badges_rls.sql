-- Fix RLS policies for user_badges table
-- This migration ensures that users can view their own badges and that system functions can insert badges

-- Enable RLS on user_badges table if not already enabled
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can update their own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can delete their own badges" ON user_badges;
DROP POLICY IF EXISTS "System can insert badges" ON user_badges;

-- Create policies for user_badges table
-- Users can view their own badges
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Users cannot insert their own badges (badges are awarded by the system)
-- CREATE POLICY "Users can insert their own badges" ON user_badges
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update their own badges (badges are managed by the system)
-- CREATE POLICY "Users can update their own badges" ON user_badges
--   FOR UPDATE USING (auth.uid() = user_id);

-- Users cannot delete their own badges (badges are permanent achievements)
-- CREATE POLICY "Users can delete their own badges" ON user_badges
--   FOR DELETE USING (auth.uid() = user_id);

-- System functions can insert badges (this allows the process-badges function to work)
-- This policy allows authenticated users to insert badges, which is necessary for the badge system
-- The process-badges function uses the service role key, so it bypasses RLS entirely
-- This policy is mainly for any client-side badge operations that might be needed
CREATE POLICY "System can insert badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Note: The process-badges function uses the service role key (SUPABASE_SERVICE_ROLE_KEY)
-- which bypasses RLS policies entirely, so this policy is mainly for any other badge operations

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at); 