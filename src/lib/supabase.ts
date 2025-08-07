
// This file is now a simple re-export of the client from integrations
import { supabase } from '@/integrations/supabase/client';

export { supabase };

// SQL function (stored in the database):
/*
CREATE OR REPLACE FUNCTION get_circle_balance(circle_id_param UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  circle_balance NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN type = 'contribution' AND status = 'completed' THEN amount
        WHEN type = 'payout' AND status = 'completed' THEN -amount
        ELSE 0
      END
    ), 0) INTO circle_balance
  FROM circle_transactions
  WHERE circle_id = circle_id_param;
  
  RETURN circle_balance;
END;
$$;
*/
