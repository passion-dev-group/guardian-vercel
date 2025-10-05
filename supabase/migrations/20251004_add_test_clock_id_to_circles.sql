-- Add test_clock_id column to circles table for Plaid sandbox test clocks
-- This allows all members of a circle to share the same test clock for synchronized testing

ALTER TABLE circles
ADD COLUMN IF NOT EXISTS test_clock_id TEXT;

CREATE INDEX IF NOT EXISTS idx_circles_test_clock_id
  ON circles(test_clock_id);

COMMENT ON COLUMN circles.test_clock_id IS 'Plaid sandbox test clock id used for this circle (shared by all members)';

