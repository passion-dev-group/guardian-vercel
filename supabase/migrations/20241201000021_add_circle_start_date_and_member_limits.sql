-- Add start_date and member limit fields to circles table
ALTER TABLE circles 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS min_members INTEGER DEFAULT 2 CHECK (min_members >= 2),
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10 CHECK (max_members >= min_members);

-- Add comments for documentation
COMMENT ON COLUMN circles.start_date IS 'Date when the savings circle will begin collecting contributions';
COMMENT ON COLUMN circles.min_members IS 'Minimum number of members required to start the circle';
COMMENT ON COLUMN circles.max_members IS 'Maximum number of members allowed in the circle';

-- Create index for start_date queries
CREATE INDEX IF NOT EXISTS idx_circles_start_date ON circles(start_date);
