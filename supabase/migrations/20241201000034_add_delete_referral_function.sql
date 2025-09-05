-- Add delete referral functionality

-- Create function to delete a referral (only if pending)
CREATE OR REPLACE FUNCTION public.delete_referral(
  p_referral_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  referral_record RECORD;
  result JSON;
BEGIN
  -- Find the referral record
  SELECT * INTO referral_record
  FROM referrals
  WHERE id = p_referral_id
    AND referrer_id = p_user_id;
    
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Referral not found or you do not have permission to delete it');
  END IF;
  
  -- Check if referral is still pending (can only delete pending referrals)
  IF referral_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', format('Cannot delete referral with status: %s. Only pending referrals can be deleted.', referral_record.status));
  END IF;
  
  -- Delete the referral
  DELETE FROM referrals
  WHERE id = p_referral_id
    AND referrer_id = p_user_id
    AND status = 'pending';
  
  -- Verify deletion worked
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to delete referral');
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'Referral deleted successfully',
    'deleted_referral_code', referral_record.referral_code
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_referral(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_referral(UUID, UUID) IS 'Deletes a pending referral code for the authenticated user';
