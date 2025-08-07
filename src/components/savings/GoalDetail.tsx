
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useAutomatedTransfers } from '@/hooks/useAutomatedTransfers';
import { useDailyAllocations } from '@/hooks/useDailyAllocations';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { GoalHeader } from './circle-goal/GoalHeader';
import { LoadingState } from './circle-goal/LoadingState';
import { ErrorState } from './circle-goal/ErrorState';
import { ProgressCard } from './circle-goal/ProgressCard';
import { GoalDetailsCard } from './circle-goal/GoalDetailsCard';
import { TransferHistoryCard } from './circle-goal/TransferHistoryCard';
import { DepositDialog } from './circle-goal/DepositDialog';
import { ActionButtons } from './circle-goal/ActionButtons';

// Add explicit interface for GoalDetail props
interface GoalDetailProps {
  goalId?: string;
}

export default function GoalDetail({ goalId: propGoalId }: GoalDetailProps) {
  // If goalId was not passed as a prop, try to get it from URL params
  const { goalId: urlGoalId } = useParams<{ goalId: string }>();
  const goalId = propGoalId || urlGoalId;
  const navigate = useNavigate();
  const { updateGoal, addManualDeposit, isUpdating, isDepositing } = useSavingsGoals();
  const { transfers, isLoading: isLoadingTransfers } = useAutomatedTransfers(goalId);
  const { allocation, isRefreshing, refreshAllocation } = useDailyAllocations(goalId);
  
  const [depositAmount, setDepositAmount] = useState<string>('25');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  
  // Fetch goal details
  const { data: goal, isLoading, error } = useQuery({
    queryKey: ['savingsGoal', goalId],
    queryFn: async () => {
      if (!goalId) return null;
      
      try {
        const { data, error } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('id', goalId)
          .maybeSingle();
          
        if (error) throw error;
        
        if (!data) {
          console.error('Goal not found:', goalId);
          return null;
        }
        
        if (data && data.target_date) {
          setTargetDate(new Date(data.target_date));
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching goal:', err);
        toast.error('Could not load goal details');
        return null;
      }
    },
    enabled: !!goalId,
    retry: 1
  });
  
  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Handle adding a manual deposit
  const handleAddDeposit = async () => {
    if (!goalId) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      await addManualDeposit({
        goal_id: goalId,
        amount
      });
      
      setIsDepositDialogOpen(false);
      setDepositAmount('25'); // Reset to default
    } catch (error) {
      console.error('Error adding deposit:', error);
    }
  };
  
  // Handle toggling goal status (pause/resume)
  const handleToggleStatus = async () => {
    if (!goal || !goalId) return;
    
    try {
      await updateGoal({
        id: goalId,
        is_active: !goal.is_active
      });
    } catch (error) {
      console.error('Error toggling goal status:', error);
    }
  };

  // Handle updating goal target date
  const handleUpdateTargetDate = async () => {
    if (!goal || !goalId || !targetDate) return;
    
    try {
      await updateGoal({
        id: goalId,
        target_date: format(targetDate, 'yyyy-MM-dd')
      });
      
      setIsDatePopoverOpen(false);
      toast.success('Target date updated successfully');
      
      // Refresh allocation after target date update
      refreshAllocation();
    } catch (error) {
      console.error('Error updating target date:', error);
      toast.error('Failed to update target date');
    }
  };
  
  if (isLoading) {
    return <LoadingState />;
  }
  
  if (error) {
    console.error('Error loading goal:', error);
    return <ErrorState />;
  }
  
  if (!goal) {
    return <ErrorState />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <GoalHeader 
        goalName={goal.name} 
        navigateBack={() => navigate('/savings-goals')}
      />
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main card with progress */}
        <ProgressCard 
          currentAmount={goal.current_amount}
          targetAmount={goal.target_amount}
          allocation={allocation}
          isActive={goal.is_active}
          isRefreshing={isRefreshing}
          refreshAllocation={refreshAllocation}
          formatCurrency={formatCurrency}
        />
        
        {/* Goal details card */}
        <GoalDetailsCard 
          goal={goal}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          isDatePopoverOpen={isDatePopoverOpen}
          setIsDatePopoverOpen={setIsDatePopoverOpen}
          handleUpdateTargetDate={handleUpdateTargetDate}
          formatCurrency={formatCurrency}
        />
      </div>
      
      <DepositDialog 
        isOpen={isDepositDialogOpen}
        setIsOpen={setIsDepositDialogOpen}
        handleAddDeposit={handleAddDeposit}
        depositAmount={depositAmount}
        setDepositAmount={setDepositAmount}
        isDepositing={isDepositing}
      />
      
      <div className="mt-4">
        <ActionButtons 
          isActive={goal.is_active}
          isUpdating={isUpdating}
          setIsDepositDialogOpen={setIsDepositDialogOpen}
          handleToggleStatus={handleToggleStatus}
        />
      </div>
      
      {/* Transaction history */}
      <TransferHistoryCard 
        transfers={transfers}
        isLoadingTransfers={isLoadingTransfers}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
