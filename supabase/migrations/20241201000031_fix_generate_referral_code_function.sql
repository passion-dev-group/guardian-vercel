-- Fix ambiguous column reference in generate_referral_code function

CREATE OR REPLACE FUNCTION public.generate_referral_code(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_referral_code TEXT;
  result JSON;
BEGIN
  -- Generate unique referral code
  LOOP
    v_referral_code := upper(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE referrals.referral_code = v_referral_code);
  END LOOP;
  
  -- Insert referral record
  INSERT INTO referrals (referrer_id, referral_code, referred_email, referred_phone)
  VALUES (p_user_id, v_referral_code, p_email, p_phone);
  
  result := json_build_object(
    'success', true,
    'referral_code', v_referral_code,
    'referral_link', format('https://%s/signup?ref=%s', 
      coalesce(current_setting('app.domain', true), 'localhost:3000'), 
      v_referral_code)
  );
  
  RETURN result;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID, TEXT, TEXT) TO authenticated;
