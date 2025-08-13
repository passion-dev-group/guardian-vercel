-- Add address fields to profiles table
ALTER TABLE profiles 
ADD COLUMN address_street TEXT,
ADD COLUMN address_city TEXT,
ADD COLUMN address_state TEXT,
ADD COLUMN address_zip TEXT,
ADD COLUMN address_country TEXT DEFAULT 'US';

-- Add index for address fields for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_address_country ON profiles(address_country);
CREATE INDEX IF NOT EXISTS idx_profiles_address_state ON profiles(address_state);

-- Add comment to document the new fields
COMMENT ON COLUMN profiles.address_street IS 'Street address for payment processing';
COMMENT ON COLUMN profiles.address_city IS 'City for payment processing';
COMMENT ON COLUMN profiles.address_state IS 'State/province for payment processing';
COMMENT ON COLUMN profiles.address_zip IS 'ZIP/postal code for payment processing';
COMMENT ON COLUMN profiles.address_country IS 'Country code for payment processing (default: US)';
