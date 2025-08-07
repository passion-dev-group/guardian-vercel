-- Add created_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have a created_at value
UPDATE profiles 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- Make created_at NOT NULL after setting default values
ALTER TABLE profiles 
ALTER COLUMN created_at SET NOT NULL; 