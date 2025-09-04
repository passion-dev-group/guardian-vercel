-- Create function to get top circles by member count with analytics data
CREATE OR REPLACE FUNCTION public.get_top_circles(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  member_count BIGINT,
  completion_rate NUMERIC,
  avg_contribution NUMERIC,
  avg_delay NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_value INTEGER;
BEGIN
  -- Calculate offset for pagination
  offset_value := (p_page - 1) * p_page_size;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(cm.id) as member_count,
    -- Calculate completion rate based on successful transactions vs expected
    CASE 
      WHEN COUNT(cm.id) > 0 THEN
        ROUND(
          (COUNT(CASE WHEN ct.status = 'completed' THEN 1 END)::NUMERIC / 
           NULLIF(COUNT(cm.id) * 
             CASE 
               WHEN c.frequency = 'weekly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 7)
               WHEN c.frequency = 'biweekly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 14)
               WHEN c.frequency = 'monthly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 30)
               ELSE 1
             END, 0)) * 100, 2)
      ELSE 0
    END as completion_rate,
    -- Average contribution amount
    COALESCE(AVG(ct.amount), 0) as avg_contribution,
    -- Average delay in days (difference between expected and actual transaction dates)
    COALESCE(AVG(
      CASE 
        WHEN ct.transaction_date IS NOT NULL AND ct.created_at IS NOT NULL THEN
          EXTRACT(DAYS FROM ct.transaction_date - ct.created_at)
        ELSE 0
      END
    ), 0) as avg_delay
  FROM circles c
  LEFT JOIN circle_members cm ON c.id = cm.circle_id
  LEFT JOIN circle_transactions ct ON c.id = ct.circle_id 
    AND ct.type = 'contribution'
    AND (p_start_date IS NULL OR ct.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR ct.transaction_date <= p_end_date)
  WHERE 
    -- Filter by frequency if provided
    (p_frequency IS NULL OR c.frequency = p_frequency)
    -- Filter by date range if provided
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date)
  GROUP BY c.id, c.name, c.frequency, c.created_at
  HAVING COUNT(cm.id) > 0  -- Only include circles with members
  ORDER BY COUNT(cm.id) DESC, 
           ROUND((COUNT(CASE WHEN ct.status = 'completed' THEN 1 END)::NUMERIC / 
                  NULLIF(COUNT(cm.id) * 
                    CASE 
                      WHEN c.frequency = 'weekly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 7)
                      WHEN c.frequency = 'biweekly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 14)
                      WHEN c.frequency = 'monthly' THEN GREATEST(1, EXTRACT(DAYS FROM COALESCE(p_end_date, CURRENT_DATE) - GREATEST(c.created_at::DATE, COALESCE(p_start_date, c.created_at::DATE))) / 30)
                      ELSE 1
                    END, 0)) * 100, 2) DESC
  LIMIT p_page_size
  OFFSET offset_value;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_circles(DATE, DATE, TEXT, INTEGER, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_top_circles(DATE, DATE, TEXT, INTEGER, INTEGER) IS 'Returns top circles by member count with analytics metrics including completion rate, average contribution, and average delay';
