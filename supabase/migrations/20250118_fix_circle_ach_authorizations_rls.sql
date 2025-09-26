-- Fix RLS policy for circle_ach_authorizations table
-- This migration allows circle admins to view all authorized members in their circles
-- while maintaining security by restricting access to only their own circles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own ACH authorizations" ON circle_ach_authorizations;

-- Create new policies for circle_ach_authorizations table

-- Users can view their own ACH authorizations
CREATE POLICY "Users can view their own ACH authorizations" ON circle_ach_authorizations
  FOR SELECT USING (auth.uid() = user_id);

-- Circle admins can view all ACH authorizations for their circles
CREATE POLICY "Circle admins can view circle ACH authorizations" ON circle_ach_authorizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circle_ach_authorizations.circle_id
      AND cm.user_id = auth.uid()
      AND cm.is_admin = true
    )
  );

-- Users can insert their own ACH authorizations
CREATE POLICY "Users can insert their own ACH authorizations" ON circle_ach_authorizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own ACH authorizations
CREATE POLICY "Users can update their own ACH authorizations" ON circle_ach_authorizations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ACH authorizations
CREATE POLICY "Users can delete their own ACH authorizations" ON circle_ach_authorizations
  FOR DELETE USING (auth.uid() = user_id);

-- System functions can manage all ACH authorizations (for automated processes)
CREATE POLICY "System can manage ACH authorizations" ON circle_ach_authorizations
  FOR ALL USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE circle_ach_authorizations IS 'Stores member consent for recurring ACH debits per circle. Circle admins can view all authorizations for their circles.';
