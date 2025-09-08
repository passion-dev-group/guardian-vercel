import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SoloSavingsTransaction {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  type: 'recurring_contribution' | 'manual_deposit' | 'adjustment';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_date: string;
  description: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useSoloSavingsTransactions = (goalId: string) => {
  const { user } = useAuth();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['soloSavingsTransactions', goalId],
    queryFn: async () => {
      if (!user || !goalId) return [];

      const { data, error } = await supabase
        .from('solo_savings_transactions')
        .select('*')
        .eq('goal_id', goalId)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching solo savings transactions:', error);
        throw error;
      }

      return data as SoloSavingsTransaction[];
    },
    enabled: !!user && !!goalId
  });

  return {
    transactions,
    isLoading,
    error
  };
};
