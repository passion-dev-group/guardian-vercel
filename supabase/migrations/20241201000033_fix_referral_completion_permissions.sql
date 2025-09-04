-- Fix referral completion function permissions and RLS issues

-- Add RLS policy to allow service role to manage referrals
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL TO service_role USING (true);

-- Update the process_referral_completion function to be more robust
CREATE OR REPLACE FUNCTION public.process_referral_completion(
  p_referral_code TEXT,
  p_referred_user_id UUID,
  p_completion_type TEXT DEFAULT 'signup'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  referral_record RECORD;
  reward_amount DECIMAL(10,2);
  result JSON;
BEGIN
  -- Log the attempt for debugging
  RAISE NOTICE 'Processing referral completion: code=%, user=%, type=%', p_referral_code, p_referred_user_id, p_completion_type;
  
  -- Find the referral record (check both pending and any status for debugging)
  SELECT * INTO referral_record
  FROM referrals
  WHERE referral_code = p_referral_code;
    
  IF NOT FOUND THEN
    RAISE NOTICE 'Referral code not found: %', p_referral_code;
    RETURN json_build_object('success', false, 'error', 'Referral code not found');
  END IF;
  
  -- Check if already processed
  IF referral_record.status != 'pending' THEN
    RAISE NOTICE 'Referral already processed: code=%, status=%', p_referral_code, referral_record.status;
    RETURN json_build_object('success', false, 'error', format('Referral already processed with status: %s', referral_record.status));
  END IF;
  
  -- Determine reward amount based on completion type
  CASE p_completion_type
    WHEN 'signup' THEN reward_amount := 5.00;
    WHEN 'first_circle' THEN reward_amount := 10.00;
    WHEN 'first_contribution' THEN reward_amount := 15.00;
    ELSE reward_amount := 5.00;
  END CASE;
  
  RAISE NOTICE 'Updating referral record: id=%, reward=%', referral_record.id, reward_amount;
  
  -- Update referral record
  UPDATE referrals
  SET 
    referred_user_id = p_referred_user_id,
    status = 'completed',
    reward_amount = reward_amount,
    completed_at = NOW()
  WHERE id = referral_record.id;
  
  -- Verify the update worked
  IF NOT FOUND THEN
    RAISE NOTICE 'Failed to update referral record: %', referral_record.id;
    RETURN json_build_object('success', false, 'error', 'Failed to update referral record');
  END IF;
  
  RAISE NOTICE 'Creating reward record: referrer=%, amount=%', referral_record.referrer_id, reward_amount;
  
  -- Create reward record
  INSERT INTO referral_rewards (
    user_id, 
    referral_id, 
    reward_type, 
    reward_amount, 
    description
  ) VALUES (
    referral_record.referrer_id,
    referral_record.id,
    p_completion_type,
    reward_amount,
    format('Referral reward for %s completion', p_completion_type)
  );
  
  RAISE NOTICE 'Referral completion successful: referrer=%, reward=%', referral_record.referrer_id, reward_amount;
  
  result := json_build_object(
    'success', true,
    'referrer_id', referral_record.referrer_id,
    'reward_amount', reward_amount,
    'completion_type', p_completion_type
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in process_referral_completion: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_referral_completion(TEXT, UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.process_referral_completion(TEXT, UUID, TEXT) IS 'Processes referral completion and assigns rewards with improved error handling';
