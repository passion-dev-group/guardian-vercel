
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SoloDailyAllocation {
  id: string;
  user_id: string;
  goal_id: string;
  date: string;
  suggested_amount: number;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
  updated_at: string;
}

export const useSoloDailyAllocations = (goalId: string | undefined) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Fetch today's allocation for the specific goal
  const {
    data: allocation,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['soloDailyAllocation', goalId, today],
    queryFn: async () => {
      if (!goalId) return null;
      
      try {
        const { data, error } = await supabase
          .from('solo_daily_allocations')
          .select('*')
          .eq('goal_id', goalId)
          .eq('date', today)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching daily allocation:', error);
          return null;
        }
        
        return data as SoloDailyAllocation | null;
      } catch (err) {
        console.error('Error fetching daily allocation:', err);
        return null;
      }
    },
    enabled: !!goalId,
    retry: 1
  });

  // Manually refresh allocation data
  const refreshAllocation = async () => {
    if (!goalId) return;
    
    setIsRefreshing(true);
    
    try {
      const { error } = await supabase.functions.invoke('solo-savings-engine', {
        body: { goalId }
      });
      
      if (error) throw error;
      
      await refetch();
      toast.success('Daily allocation refreshed');
    } catch (error) {
      console.error('Error refreshing allocation:', error);
      toast.error('Failed to refresh allocation');
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
