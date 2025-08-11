-- Add trigger to automatically sync email from auth.users to profiles table
-- This ensures that when a profile is created or updated, the email is automatically populated

-- Create function to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users table
  NEW.email = (
    SELECT email 
    FROM auth.users 
    WHERE id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert or update on profiles
DROP TRIGGER IF EXISTS trigger_sync_profile_email ON profiles;
CREATE TRIGGER trigger_sync_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- Update existing profiles to have their emails synced
UPDATE profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE email IS NULL OR email = '';

-- Add comment for documentation
COMMENT ON FUNCTION sync_profile_email() IS 'Automatically syncs email from auth.users to profiles table';
COMMENT ON TRIGGER trigger_sync_profile_email ON profiles IS 'Triggers email sync when profile is created or updated';
