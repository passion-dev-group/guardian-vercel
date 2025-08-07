
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEdgeFunction } from '@/hooks/useEdgeFunction';

interface AutomatedTransfer {
  id: string;
  goal_id: string;
  amount: number;
  scheduled_for: string;
  executed_at: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

interface AnalyzeSpendingResult {
  suggestedAmount: number;
}

export const useAutomatedTransfers = (goalId?: string) => {
  const { callFunction } = useEdgeFunction<AnalyzeSpendingResult>();
  
  // Get transfers for a specific goal or all goals
  const { data: transfers, isLoading } = useQuery({
    queryKey: ['automatedTransfers', goalId],
    queryFn: async () => {
      let query = supabase
        .from('automated_savings')
        .select('*')
        .order('scheduled_for', { ascending: false });
      
      if (goalId) {
        query = query.eq('goal_id', goalId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AutomatedTransfer[];
    },
    enabled: !!goalId || goalId === undefined
  });
  
  // Get suggested transfer amount based on spending patterns
  const getSuggestedAmount = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    
    try {
      const result = await callFunction({
        functionName: 'smart-transfer-engine',
        body: { userId: userData.user.id },
        headers: { path: 'analyze-spending' }
      });
      
      return result;
    } catch (error) {
      console.error('Error getting suggested transfer amount:', error);
      return null;
    }
  };
  
  // Calculate estimated completion date for a goal based on average transfers
  const getEstimatedCompletionDate = (
    currentAmount: number,
    targetAmount: number,
    goalTransfers: AutomatedTransfer[]
  ): Date | null => {
    if (currentAmount >= targetAmount) {
      return new Date(); // Already complete
    }
    
    if (!goalTransfers || goalTransfers.length === 0) {
      return null; // Can't estimate without transfer history
    }
    
    // Calculate average transfer amount
    const completedTransfers = goalTransfers.filter(t => t.status === 'completed');
    if (completedTransfers.length === 0) return null;
    
    const totalAmount = completedTransfers.reduce((sum, t) => sum + Number(t.amount), 0);
    const avgAmount = totalAmount / completedTransfers.length;
    
    if (avgAmount <= 0) return null;
    
    // Calculate how many more transfers needed
    const amountRemaining = targetAmount - currentAmount;
    const transfersNeeded = Math.ceil(amountRemaining / avgAmount);
    
    // Get frequency of transfers
    const daysBetweenTransfers = getAverageDaysBetweenTransfers(completedTransfers);
    if (daysBetweenTransfers <= 0) return null;
    
    // Calculate estimated completion date
    const today = new Date();
    const daysToComplete = transfersNeeded * daysBetweenTransfers;
    const estimatedDate = new Date(today);
    estimatedDate.setDate(today.getDate() + daysToComplete);
    
    return estimatedDate;
  };
  
  // Helper function to calculate average days between transfers
  const getAverageDaysBetweenTransfers = (transfers: AutomatedTransfer[]): number => {
    if (transfers.length < 2) return 30; // Default to monthly if not enough data
    
    // Sort by date
    const sortedTransfers = [...transfers].sort(
      (a, b) => new Date(a.executed_at || a.created_at).getTime() - 
                new Date(b.executed_at || b.created_at).getTime()
    );
    
    let totalDays = 0;
    for (let i = 1; i < sortedTransfers.length; i++) {
      const current = new Date(sortedTransfers[i].executed_at || sortedTransfers[i].created_at);
      const previous = new Date(sortedTransfers[i-1].executed_at || sortedTransfers[i-1].created_at);
      const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
      totalDays += diffDays;
    }
    
    return totalDays / (sortedTransfers.length - 1);
  };
  
  return {
    transfers,
    isLoading,
    getSuggestedAmount,
    getEstimatedCompletionDate
  };
};
