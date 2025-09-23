-- Fix frequency constraint to allow both 'yearly' and 'annual' for backward compatibility
-- This migration updates the check constraint to accept both values

-- First, update any existing 'annual' values to 'yearly' for consistency
UPDATE circle_ach_authorizations 
SET frequency = 'yearly' 
WHERE frequency = 'annual';

-- Update the constraint to allow both values temporarily
ALTER TABLE circle_ach_authorizations 
DROP CONSTRAINT IF EXISTS circle_ach_authorizations_frequency_check;

-- Add the updated constraint that allows both 'yearly' and 'annual'
ALTER TABLE circle_ach_authorizations 
ADD CONSTRAINT circle_ach_authorizations_frequency_check 
CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','yearly','annual'));

-- Add comment for documentation
COMMENT ON CONSTRAINT circle_ach_authorizations_frequency_check ON circle_ach_authorizations 
IS 'Allows both yearly and annual for backward compatibility. Prefer yearly for new records.';

-- Also fix the solo_savings_recurring_contributions table if it exists
-- First, update any existing 'annual' values to 'yearly' for consistency
UPDATE solo_savings_recurring_contributions 
SET frequency = 'yearly' 
WHERE frequency = 'annual';

-- Update the constraint to allow both values temporarily
ALTER TABLE solo_savings_recurring_contributions 
DROP CONSTRAINT IF EXISTS solo_savings_recurring_contributions_frequency_check;

-- Add the updated constraint that allows both 'yearly' and 'annual'
ALTER TABLE solo_savings_recurring_contributions 
ADD CONSTRAINT solo_savings_recurring_contributions_frequency_check 
CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly','yearly','annual'));

-- Add comment for documentation
COMMENT ON CONSTRAINT solo_savings_recurring_contributions_frequency_check ON solo_savings_recurring_contributions 
IS 'Allows both yearly and annual for backward compatibility. Prefer yearly for new records.';
