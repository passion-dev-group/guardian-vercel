
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import { useSoloDailyAllocations } from '@/hooks/useSoloDailyAllocations';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

interface SoloGoalDetailProps {
  goalId: string;
}

export default function SoloGoalDetail({ goalId }: SoloGoalDetailProps) {
  const navigate = useNavigate();
  const { updateGoal, addManualDeposit, isUpdating } = useSoloSavingsGoals();
  const { allocation, isRefreshing, refreshAllocation } = useSoloDailyAllocations(goalId);
  
  const [depositAmount, setDepositAmount] = useState<string>('25');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  
  // Fetch goal details
  const { data: goal, isLoading, error } = useQuery({
    queryKey: ['soloSavingsGoal', goalId],
    queryFn: async () => {
      if (!goalId) return null;
      
      try {
        const { data, error } = await supabase
          .from('solo_savings_goals')
          .select('*')
          .eq('id', goalId)
          .maybeSingle();
          
        if (error) throw error;
        
        if (!data) {
          console.error('Solo goal not found:', goalId);
          return null;
        }
        
        if (data && data.target_date) {
          setTargetDate(new Date(data.target_date));
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching solo goal:', err);
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
  
  // Handle toggling goal status (pause/resume)
  const handleToggleStatus = async () => {
    if (!goal || !goalId) return;
    
    try {
      await updateGoal({
        id: goalId,
        daily_transfer_enabled: !goal.daily_transfer_enabled
      });
      
      if (goal.daily_transfer_enabled) {
        toast.info('Goal has been paused');
      } else {
        toast.success('Goal has been resumed');
      }
    } catch (error) {
      console.error('Error toggling goal status:', error);
      toast.error('Failed to update goal status');
    }
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
        goalId,
        amount
      });
      
      setIsDepositDialogOpen(false);
      setDepositAmount('25'); // Reset to default
      toast.success(`Added ${formatCurrency(amount)} to your goal`);
    } catch (error) {
      console.error('Error adding deposit:', error);
      toast.error('Failed to add deposit');
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Error state
  if (error || !goal) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Goal</h2>
        <p className="text-muted-foreground mb-4">
          We couldn't load the requested goal. It may not exist or you don't have access to it.
        </p>
        <Button onClick={() => navigate('/savings-goals')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Savings Goals
        </Button>
      </div>
    );
  }
  
  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Goal Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/savings-goals')} 
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{goal.name}</h1>
        </div>
        <Button
          variant={goal.daily_transfer_enabled ? "outline" : "default"}
          onClick={handleToggleStatus}
          disabled={isUpdating}
          size="sm"
        >
          {goal.daily_transfer_enabled ? "Pause Goal" : "Resume Goal"}
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progress Card */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Progress</h2>
          
          <div className="flex justify-between text-sm mb-2">
            <span>{formatCurrency(goal.current_amount)}</span>
            <span>{formatCurrency(goal.target_amount)}</span>
          </div>
          
          <div className="h-2 bg-muted rounded-full mb-1 overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="text-center mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{progressPercentage}%</span> complete
          </div>
          
          <div className="mt-6">
            <Button 
              className="w-full" 
              onClick={() => setIsDepositDialogOpen(true)}
            >
              Add Deposit
            </Button>
          </div>
          
          {/* Today's Allocation */}
          {allocation && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Today's Allocation</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={refreshAllocation}
                  disabled={isRefreshing}
                >
                  Refresh
                </Button>
              </div>
              
              <p className="text-2xl font-bold">{formatCurrency(allocation.suggested_amount)}</p>
              <p className="text-sm text-muted-foreground">Suggested savings for today</p>
            </div>
          )}
        </Card>
        
        {/* Goal Details */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Goal Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Goal Name</h3>
              <p>{goal.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Target Amount</h3>
              <p>{formatCurrency(goal.target_amount)}</p>
            </div>
            
            {goal.target_date && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Target Date</h3>
                <p>{format(new Date(goal.target_date), 'MMMM d, yyyy')}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created On</h3>
              <p>{format(new Date(goal.created_at), 'MMMM d, yyyy')}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${goal.daily_transfer_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                {goal.daily_transfer_enabled ? 'Active' : 'Paused'}
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1" 
              onClick={() => navigate(`/savings-goals/edit/${goal.id}`)}
            >
              Edit Goal
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleAddDeposit}
            >
              Delete
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Deposit Dialog */}
      {isDepositDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Add Deposit</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    id="amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    placeholder="0.00"
                    min="1"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDepositDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddDeposit}>
                  Add Deposit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
