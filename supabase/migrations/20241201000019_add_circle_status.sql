-- Add status field to circles table
ALTER TABLE circles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled'));

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_circles_status ON circles(status);

-- Update existing circles to have 'active' status
UPDATE circles SET status = 'active' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN circles.status IS 'Circle status: active, inactive, completed, or cancelled';
