-- Create leaderboard RPC functions for social features

-- 1. get_savings_leaderboard - Top savers by total contribution amount
CREATE OR REPLACE FUNCTION public.get_savings_leaderboard(
  p_timeframe TEXT DEFAULT 'all', -- 'weekly', 'monthly', 'yearly', 'all'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_saved NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_date DATE;
BEGIN
  -- Calculate start date based on timeframe
  CASE p_timeframe
    WHEN 'weekly' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'monthly' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'yearly' THEN start_date := CURRENT_DATE - INTERVAL '365 days';
    ELSE start_date := NULL; -- All time
  END CASE;

  RETURN QUERY
  WITH user_savings AS (
    SELECT 
      ct.user_id,
      SUM(ct.amount) as total_saved
    FROM circle_transactions ct
    WHERE ct.type = 'contribution' 
      AND ct.status = 'completed'
      AND (start_date IS NULL OR ct.transaction_date >= start_date)
    GROUP BY ct.user_id
  ),
  ranked_users AS (
    SELECT 
      us.user_id,
      us.total_saved,
      ROW_NUMBER() OVER (ORDER BY us.total_saved DESC) as rank
    FROM user_savings us
  )
  SELECT 
    ru.user_id,
    COALESCE(p.display_name, 'Anonymous User') as display_name,
    p.avatar_url,
    ru.total_saved,
    ru.rank
  FROM ranked_users ru
  LEFT JOIN profiles p ON ru.user_id = p.id
  ORDER BY ru.rank
  LIMIT p_limit;
END;
$function$;

-- 2. get_streak_leaderboard - Top users by current payment streak
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  current_streak INTEGER,
  longest_streak INTEGER,
  tier TEXT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH ranked_streaks AS (
    SELECT 
      ut.user_id,
      ut.current_streak,
      ut.longest_streak,
      ut.tier,
      ROW_NUMBER() OVER (ORDER BY ut.current_streak DESC, ut.longest_streak DESC) as rank
    FROM user_tiers ut
    WHERE ut.current_streak > 0
  )
  SELECT 
    rs.user_id,
    COALESCE(p.display_name, 'Anonymous User') as display_name,
    p.avatar_url,
    rs.current_streak,
    rs.longest_streak,
    rs.tier,
    rs.rank
  FROM ranked_streaks rs
  LEFT JOIN profiles p ON rs.user_id = p.id
  ORDER BY rs.rank
  LIMIT p_limit;
END;
$function$;

-- 3. get_points_leaderboard - Top users by total points
CREATE OR REPLACE FUNCTION public.get_points_leaderboard(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  points INTEGER,
  tier TEXT,
  badge_count BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH user_badge_counts AS (
    SELECT 
      ub.user_id,
      COUNT(ub.id) as badge_count
    FROM user_badges ub
    GROUP BY ub.user_id
  ),
  ranked_points AS (
    SELECT 
      ut.user_id,
      ut.points,
      ut.tier,
      COALESCE(ubc.badge_count, 0) as badge_count,
      ROW_NUMBER() OVER (ORDER BY ut.points DESC) as rank
    FROM user_tiers ut
    LEFT JOIN user_badge_counts ubc ON ut.user_id = ubc.user_id
  )
  SELECT 
    rp.user_id,
    COALESCE(p.display_name, 'Anonymous User') as display_name,
    p.avatar_url,
    rp.points,
    rp.tier,
    rp.badge_count,
    rp.rank
  FROM ranked_points rp
  LEFT JOIN profiles p ON rp.user_id = p.id
  ORDER BY rp.rank
  LIMIT p_limit;
END;
$function$;

-- 4. get_circle_completion_leaderboard - Top users by circle completion rate
CREATE OR REPLACE FUNCTION public.get_circle_completion_leaderboard(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  circles_joined BIGINT,
  circles_completed BIGINT,
  completion_rate NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH user_circle_stats AS (
    SELECT 
      cm.user_id,
      COUNT(cm.id) as circles_joined,
      COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as circles_completed,
      CASE 
        WHEN COUNT(cm.id) > 0 THEN
          ROUND((COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::NUMERIC / COUNT(cm.id)) * 100, 2)
        ELSE 0
      END as completion_rate
    FROM circle_members cm
    LEFT JOIN circles c ON cm.circle_id = c.id
    GROUP BY cm.user_id
    HAVING COUNT(cm.id) >= 2 -- Only users who joined at least 2 circles
  ),
  ranked_completion AS (
    SELECT 
      ucs.*,
      ROW_NUMBER() OVER (ORDER BY ucs.completion_rate DESC, ucs.circles_completed DESC) as rank
    FROM user_circle_stats ucs
  )
  SELECT 
    rc.user_id,
    COALESCE(p.display_name, 'Anonymous User') as display_name,
    p.avatar_url,
    rc.circles_joined,
    rc.circles_completed,
    rc.completion_rate,
    rc.rank
  FROM ranked_completion rc
  LEFT JOIN profiles p ON rc.user_id = p.id
  ORDER BY rc.rank
  LIMIT p_limit;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_savings_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_points_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_completion_leaderboard(INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_savings_leaderboard(TEXT, INTEGER) IS 'Returns top savers leaderboard with timeframe filtering';
COMMENT ON FUNCTION public.get_streak_leaderboard(INTEGER) IS 'Returns users with highest payment streaks';
COMMENT ON FUNCTION public.get_points_leaderboard(INTEGER) IS 'Returns users with most loyalty points and badges';
COMMENT ON FUNCTION public.get_circle_completion_leaderboard(INTEGER) IS 'Returns users with highest circle completion rates';
