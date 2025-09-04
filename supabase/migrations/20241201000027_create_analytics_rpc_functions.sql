-- Create all analytics RPC functions

-- 1. get_analytics_metrics - for ChartKpiCards component
CREATE OR REPLACE FUNCTION public.get_analytics_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_circles BIGINT,
  completion_rate NUMERIC,
  avg_contribution NUMERIC,
  default_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id) as total_circles,
    CASE 
      WHEN COUNT(ct.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ct.status = 'completed' THEN 1 END)::NUMERIC / COUNT(ct.id)) * 100, 2)
      ELSE 0::NUMERIC
    END as completion_rate,
    COALESCE(AVG(ct.amount), 0::NUMERIC) as avg_contribution,
    CASE 
      WHEN COUNT(ct.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ct.status = 'failed' THEN 1 END)::NUMERIC / COUNT(ct.id)) * 100, 2)
      ELSE 0::NUMERIC
    END as default_rate
  FROM circles c
  LEFT JOIN circle_transactions ct ON c.id = ct.circle_id 
    AND ct.type = 'contribution'
    AND (p_start_date IS NULL OR ct.transaction_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR ct.transaction_date::DATE <= p_end_date)
  WHERE 
    (p_frequency IS NULL OR c.frequency = p_frequency)
    AND (p_start_date IS NULL OR c.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at::DATE <= p_end_date);
END;
$function$;

-- 2. get_circle_activity_over_time - for CircleActivityChart component
CREATE OR REPLACE FUNCTION public.get_circle_activity_over_time(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  active_circles BIGINT,
  completed_circles BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days')::DATE,
      COALESCE(p_end_date, CURRENT_DATE)::DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT 
    ds.date,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_circles,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_circles
  FROM date_series ds
  LEFT JOIN circles c ON c.created_at::DATE <= ds.date
    AND (p_frequency IS NULL OR c.frequency = p_frequency)
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$function$;

-- 3. get_payment_defaults_by_day - for DefaultHeatmap component
CREATE OR REPLACE FUNCTION public.get_payment_defaults_by_day(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  default_count BIGINT,
  total_payments BIGINT,
  default_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days')::DATE,
      COALESCE(p_end_date, CURRENT_DATE)::DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT 
    ds.date,
    COUNT(CASE WHEN ct.status = 'failed' THEN 1 END) as default_count,
    COUNT(ct.id) as total_payments,
    CASE 
      WHEN COUNT(ct.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ct.status = 'failed' THEN 1 END)::NUMERIC / COUNT(ct.id)) * 100, 2)
      ELSE 0::NUMERIC
    END as default_rate
  FROM date_series ds
  LEFT JOIN circle_transactions ct ON ct.transaction_date::DATE = ds.date
    AND ct.type = 'contribution'
  LEFT JOIN circles c ON ct.circle_id = c.id
    AND (p_frequency IS NULL OR c.frequency = p_frequency)
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$function$;

-- 4. get_user_engagement_metrics - for UserEngagementGraph component
CREATE OR REPLACE FUNCTION public.get_user_engagement_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  monthly_active_users BIGINT,
  new_signups BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days')::DATE,
      COALESCE(p_end_date, CURRENT_DATE)::DATE,
      '1 day'::INTERVAL
    )::DATE as date
  )
  SELECT 
    ds.date,
    COUNT(DISTINCT CASE WHEN ct.created_at::DATE = ds.date THEN ct.user_id END) as monthly_active_users,
    COUNT(DISTINCT CASE WHEN p.created_at::DATE = ds.date THEN p.id END) as new_signups
  FROM date_series ds
  LEFT JOIN circle_transactions ct ON ct.created_at::DATE = ds.date
  LEFT JOIN profiles p ON p.created_at::DATE = ds.date
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_analytics_metrics(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_activity_over_time(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_defaults_by_day(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_engagement_metrics(DATE, DATE) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_analytics_metrics(DATE, DATE, TEXT) IS 'Returns key analytics metrics for the dashboard KPI cards';
COMMENT ON FUNCTION public.get_circle_activity_over_time(DATE, DATE, TEXT) IS 'Returns circle activity data over time for charts';
COMMENT ON FUNCTION public.get_payment_defaults_by_day(DATE, DATE, TEXT) IS 'Returns payment default data by day for heatmap visualization';
COMMENT ON FUNCTION public.get_user_engagement_metrics(DATE, DATE) IS 'Returns user engagement metrics including active users and new signups';
