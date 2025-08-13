-- Add phone number field to profiles table for payment processing
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.phone IS 'Phone number for payment processing and account verification';

-- Add index for phone number queries
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
