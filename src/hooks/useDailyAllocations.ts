
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DailyAllocation {
  id: string;
  user_id: string;
  goal_id: string;
  date: string;
  suggested_amount: number;
  suggested_percentage: number;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
  updated_at: string;
}

export const useDailyAllocations = (goalId: string | undefined) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Fetch today's allocation for the specific goal
  const {
    data: allocation,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dailyAllocation', goalId, today],
    queryFn: async () => {
      if (!goalId) return null;
      
      const { data, error } = await supabase
        .from('daily_allocations')
        .select('*')
        .eq('goal_id', goalId)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyAllocation | null;
    },
    enabled: !!goalId
  });

  // Manually refresh allocation data
  const refreshAllocation = async () => {
    if (!goalId) return;
    
    setIsRefreshing(true);
    
    try {
      await supabase.functions.invoke('daily-allocation-engine', {
        body: { goal_id: goalId }
      });
      
      await refetch();
    } catch (error) {
      console.error('Error refreshing allocation:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    allocation,
    isLoading,
    error,
    isRefreshing,
    refreshAllocation
  };
};
