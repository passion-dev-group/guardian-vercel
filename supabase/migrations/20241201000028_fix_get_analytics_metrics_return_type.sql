-- Fix get_analytics_metrics to return a single JSON object instead of a table
-- This makes it easier to consume from the frontend

DROP FUNCTION IF EXISTS public.get_analytics_metrics(DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.get_analytics_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_circles', COUNT(DISTINCT c.id),
    'completion_rate', CASE 
      WHEN COUNT(ct.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ct.status = 'completed' THEN 1 END)::NUMERIC / COUNT(ct.id)) * 100, 2)
      ELSE 0::NUMERIC
    END,
    'avg_contribution', COALESCE(AVG(ct.amount), 0::NUMERIC),
    'default_rate', CASE 
      WHEN COUNT(ct.id) > 0 THEN
        ROUND((COUNT(CASE WHEN ct.status = 'failed' THEN 1 END)::NUMERIC / COUNT(ct.id)) * 100, 2)
      ELSE 0::NUMERIC
    END
  ) INTO result
  FROM circles c
  LEFT JOIN circle_transactions ct ON c.id = ct.circle_id 
    AND ct.type = 'contribution'
    AND (p_start_date IS NULL OR ct.transaction_date::DATE >= p_start_date)
    AND (p_end_date IS NULL OR ct.transaction_date::DATE <= p_end_date)
  WHERE 
    (p_frequency IS NULL OR c.frequency = p_frequency)
    AND (p_start_date IS NULL OR c.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at::DATE <= p_end_date);

  RETURN result;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_analytics_metrics(DATE, DATE, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_analytics_metrics(DATE, DATE, TEXT) IS 'Returns key analytics metrics as a single JSON object for the dashboard KPI cards';
