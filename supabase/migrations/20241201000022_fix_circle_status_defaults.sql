-- Fix circle status defaults for existing circles
-- Set status to 'pending' for circles that don't have a status set

UPDATE circles 
SET status = 'pending' 
WHERE status IS NULL;

-- Add a default value for the status column
ALTER TABLE circles 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add a constraint to ensure status has valid values
ALTER TABLE circles 
ADD CONSTRAINT circles_status_check 
CHECK (status IN ('pending', 'active', 'started', 'completed', 'cancelled'));

-- Add comment for documentation
COMMENT ON COLUMN circles.status IS 'Current status of the circle: pending (waiting to start), active (running), started (alias for active), completed (finished), cancelled (terminated)';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_circles_status ON circles(status);
