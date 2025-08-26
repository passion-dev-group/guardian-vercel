-- Update circle_transactions status constraint to include 'processing' status
-- This allows transactions to be in processing state between pending and completed

-- Drop the existing constraint if it exists (try common naming patterns)
DO $$ 
BEGIN
    -- Try to drop constraint with common names
    BEGIN
        ALTER TABLE circle_transactions DROP CONSTRAINT IF EXISTS circle_transactions_status_check;
        RAISE NOTICE 'Dropped constraint: circle_transactions_status_check';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'No constraint circle_transactions_status_check found';
    END;
    
    -- Try alternative naming pattern
    BEGIN
        ALTER TABLE circle_transactions DROP CONSTRAINT IF EXISTS circle_transactions_check;
        RAISE NOTICE 'Dropped constraint: circle_transactions_check';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'No constraint circle_transactions_check found';
    END;
END $$;

-- Add the new constraint with 'processing' status included
ALTER TABLE circle_transactions 
ADD CONSTRAINT circle_transactions_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- Add comment for documentation
COMMENT ON CONSTRAINT circle_transactions_status_check ON circle_transactions 
IS 'Ensures status is one of: pending, processing, completed, failed, cancelled';
