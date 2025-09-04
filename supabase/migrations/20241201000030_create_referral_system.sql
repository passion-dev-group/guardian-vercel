-- Create referral system tables and functions

-- 1. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed', 'rewarded')),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- 2. Create referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('signup_bonus', 'first_circle', 'first_contribution', 'milestone')),
  reward_amount DECIMAL(10,2) NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral_id ON referral_rewards(referral_id);

-- Enable Row Level Security
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referrals
CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update their own referrals" ON referrals
  FOR UPDATE USING (referrer_id = auth.uid());

-- Create RLS policies for referral rewards
CREATE POLICY "Users can view their own rewards" ON referral_rewards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage rewards" ON referral_rewards
  FOR ALL TO service_role USING (true);

-- RPC Functions

-- 1. Generate unique referral code for user
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
  referral_code TEXT;
  result JSON;
BEGIN
  -- Generate unique referral code
  LOOP
    referral_code := upper(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE referral_code = referral_code);
  END LOOP;
  
  -- Insert referral record
  INSERT INTO referrals (referrer_id, referral_code, referred_email, referred_phone)
  VALUES (p_user_id, referral_code, p_email, p_phone);
  
  result := json_build_object(
    'success', true,
    'referral_code', referral_code,
    'referral_link', format('https://%s/signup?ref=%s', 
      coalesce(current_setting('app.domain', true), 'localhost:3000'), 
      referral_code)
  );
  
  RETURN result;
END;
$function$;

-- 2. Get user's referral statistics
CREATE OR REPLACE FUNCTION public.get_referral_stats(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_referrals', COUNT(*),
    'pending_referrals', COUNT(*) FILTER (WHERE status = 'pending'),
    'completed_referrals', COUNT(*) FILTER (WHERE status IN ('completed', 'rewarded')),
    'total_rewards', COALESCE(SUM(reward_amount), 0),
    'unclaimed_rewards', COALESCE(SUM(CASE WHEN NOT reward_claimed THEN reward_amount ELSE 0 END), 0),
    'referrals', json_agg(
      json_build_object(
        'id', id,
        'referral_code', referral_code,
        'referred_email', referred_email,
        'referred_phone', referred_phone,
        'status', status,
        'reward_amount', reward_amount,
        'reward_claimed', reward_claimed,
        'created_at', created_at,
        'completed_at', completed_at
      ) ORDER BY created_at DESC
    )
  ) INTO result
  FROM referrals
  WHERE referrer_id = p_user_id;
  
  RETURN result;
END;
$function$;

-- 3. Get referral leaderboard
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_referrals BIGINT,
  successful_referrals BIGINT,
  total_rewards NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH referral_stats AS (
    SELECT 
      r.referrer_id as user_id,
      COUNT(*) as total_referrals,
      COUNT(*) FILTER (WHERE r.status IN ('completed', 'rewarded')) as successful_referrals,
      COALESCE(SUM(r.reward_amount), 0) as total_rewards
    FROM referrals r
    GROUP BY r.referrer_id
  ),
  ranked_referrers AS (
    SELECT 
      rs.*,
      ROW_NUMBER() OVER (ORDER BY rs.successful_referrals DESC, rs.total_referrals DESC) as rank
    FROM referral_stats rs
  )
  SELECT 
    rr.user_id,
    COALESCE(p.display_name, 'Anonymous User') as display_name,
    p.avatar_url,
    rr.total_referrals,
    rr.successful_referrals,
    rr.total_rewards,
    rr.rank
  FROM ranked_referrers rr
  LEFT JOIN profiles p ON rr.user_id = p.id
  ORDER BY rr.rank
  LIMIT p_limit;
END;
$function$;

-- 4. Process referral completion (when referred user completes an action)
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
  -- Find the referral record
  SELECT * INTO referral_record
  FROM referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Referral code not found or already processed');
  END IF;
  
  -- Determine reward amount based on completion type
  CASE p_completion_type
    WHEN 'signup' THEN reward_amount := 5.00;
    WHEN 'first_circle' THEN reward_amount := 10.00;
    WHEN 'first_contribution' THEN reward_amount := 15.00;
    ELSE reward_amount := 5.00;
  END CASE;
  
  -- Update referral record
  UPDATE referrals
  SET 
    referred_user_id = p_referred_user_id,
    status = 'completed',
    reward_amount = reward_amount,
    completed_at = NOW()
  WHERE id = referral_record.id;
  
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
  
  result := json_build_object(
    'success', true,
    'referrer_id', referral_record.referrer_id,
    'reward_amount', reward_amount,
    'completion_type', p_completion_type
  );
  
  RETURN result;
END;
$function$;

-- 5. Claim referral rewards
CREATE OR REPLACE FUNCTION public.claim_referral_rewards(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  total_claimed DECIMAL(10,2);
  rewards_count INTEGER;
BEGIN
  -- Get total unclaimed rewards
  SELECT 
    COUNT(*),
    COALESCE(SUM(reward_amount), 0)
  INTO rewards_count, total_claimed
  FROM referral_rewards
  WHERE user_id = p_user_id AND NOT claimed;
  
  IF rewards_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No unclaimed rewards found');
  END IF;
  
  -- Mark rewards as claimed
  UPDATE referral_rewards
  SET claimed = true, claimed_at = NOW()
  WHERE user_id = p_user_id AND NOT claimed;
  
  -- Also update referrals table
  UPDATE referrals
  SET reward_claimed = true, reward_claimed_at = NOW()
  WHERE referrer_id = p_user_id AND NOT reward_claimed;
  
  RETURN json_build_object(
    'success', true,
    'rewards_claimed', rewards_count,
    'total_amount', total_claimed
  );
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_completion(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral_rewards(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE referrals IS 'Tracks user referrals and their status';
COMMENT ON TABLE referral_rewards IS 'Stores referral rewards earned by users';
COMMENT ON FUNCTION public.generate_referral_code(UUID, TEXT, TEXT) IS 'Generates unique referral code for user';
COMMENT ON FUNCTION public.get_referral_stats(UUID) IS 'Returns comprehensive referral statistics for a user';
COMMENT ON FUNCTION public.get_referral_leaderboard(INTEGER) IS 'Returns top referrers leaderboard';
COMMENT ON FUNCTION public.process_referral_completion(TEXT, UUID, TEXT) IS 'Processes referral completion and assigns rewards';
COMMENT ON FUNCTION public.claim_referral_rewards(UUID) IS 'Claims all unclaimed referral rewards for a user';
