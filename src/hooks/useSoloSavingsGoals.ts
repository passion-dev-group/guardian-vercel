
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface SoloSavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  daily_transfer_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateSoloGoalParams {
  name: string;
  target_amount: number;
  target_date?: string;
  daily_transfer_enabled?: boolean;
}

interface CreateSoloGoalWithRecurringParams {
  name: string;
  target_amount: number;
  target_date?: string;
  daily_transfer_enabled: boolean;
  account_id: string;
}

interface UpdateSoloGoalParams {
  id: string;
  name?: string;
  target_amount?: number;
  target_date?: string | null;
  daily_transfer_enabled?: boolean;
}

interface DailyAllocation {
  id: string;
  goal_id: string;
  date: string;
  suggested_amount: number;
  status: 'pending' | 'processed' | 'failed';
}

export const useSoloSavingsGoals = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch all solo savings goals for the current user
  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['soloSavingsGoals'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('solo_savings_goals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching solo savings goals:', error);
        throw error;
      }
      
      return data as SoloSavingsGoal[];
    },
    enabled: !!user
  });
  
  // Fetch a single goal by ID
  const fetchGoalById = async (goalId: string) => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('solo_savings_goals')
      .select('*')
      .eq('id', goalId)
      .single();
      
    if (error) {
      console.error(`Error fetching solo goal ${goalId}:`, error);
      throw error;
    }
    
    return data as SoloSavingsGoal;
  };
  
  // Create a new solo savings goal
  const createGoal = async (goalData: CreateSoloGoalParams) => {
    if (!user) {
      toast.error('You must be logged in to create a goal');
      return null;
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('solo_savings_goals')
        .insert({
          ...goalData,
          current_amount: 0,
          user_id: user.id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating solo savings goal:', error);
        throw error;
      }
      
      // Track event
      trackEvent('solo_goal_created', {
        goal_name: goalData.name,
        target_amount: goalData.target_amount,
        daily_transfer_enabled: goalData.daily_transfer_enabled
      });
      
      toast.success(`Goal "${goalData.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data as SoloSavingsGoal;
    } catch (error) {
      console.error('Error creating solo savings goal:', error);
      toast.error('Failed to create savings goal');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };
  
  // Update an existing solo savings goal
  const updateGoal = async (params: UpdateSoloGoalParams) => {
    const { id, ...updateData } = params;
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('solo_savings_goals')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Track event
      trackEvent('solo_goal_updated', { 
        goal_id: id,
        ...updateData
      });
      
      toast.success('Goal updated successfully');
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data as SoloSavingsGoal;
    } catch (error) {
      console.error('Error updating solo savings goal:', error);
      toast.error('Failed to update savings goal');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Fetch today's allocation for a specific goal
  const fetchTodayAllocation = async (goalId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('solo_daily_allocations')
      .select('*')
      .eq('goal_id', goalId)
      .eq('date', today)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching today allocation:', error);
      throw error;
    }
    
    return data as DailyAllocation | null;
  };
  
  // Process a goal manually to create today's allocation
  const processGoalManually = async (goalId: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('solo-savings-engine', {
        body: { goalId }
      });
      
      if (error) throw error;
      
      // Track event
      trackEvent('daily_transfer_scheduled', { 
        goal_id: goalId,
        manual: true
      });
      
      toast.success('Today\'s savings amount calculated');
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      queryClient.invalidateQueries({ queryKey: ['todayAllocation', goalId] });
      return data;
    } catch (error) {
      console.error('Error processing goal:', error);
      toast.error('Failed to calculate today\'s savings amount');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Add a manual deposit to a goal
  const addManualDeposit = async ({ goalId, amount }: { goalId: string; amount: number }) => {
    if (!user) {
      toast.error('You must be logged in to make a deposit');
      return null;
    }
    
    try {
      // Get the current goal
      const { data: goal, error: goalError } = await supabase
        .from('solo_savings_goals')
        .select('*')
        .eq('id', goalId)
        .single();
        
      if (goalError) throw goalError;
      
      // Update the goal's current amount
      const { data, error } = await supabase
        .from('solo_savings_goals')
        .update({
          current_amount: goal.current_amount + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Track event
      trackEvent('manual_deposit', {
        goal_id: goalId,
        amount
      });
      
      toast.success(`Added $${amount.toFixed(2)} to your goal`);
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data;
    } catch (error) {
      console.error('Error adding manual deposit:', error);
      toast.error('Failed to add deposit');
      throw error;
    }
  };

  // Delete a savings goal
  const deleteGoal = async (goalId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a goal');
      return false;
    }
    
    try {
      // First, get the goal to check if user owns it
      const { data: goal, error: goalError } = await supabase
        .from('solo_savings_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();
        
      if (goalError || !goal) {
        toast.error('Goal not found or you do not have permission to delete it');
        return false;
      }
      
      // Delete the goal
      const { error } = await supabase
        .from('solo_savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Track event
      trackEvent('solo_goal_deleted', {
        goal_id: goalId,
        goal_name: goal.name,
        target_amount: goal.target_amount
      });
      
      toast.success(`Goal "${goal.name}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
      return false;
    }
  };

  // Create a goal with recurring transfers (transfer created FIRST)
  const createGoalWithRecurring = async (params: CreateSoloGoalWithRecurringParams) => {
    if (!user) {
      toast.error('You must be logged in to create a goal');
      return null;
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-solo-goal', {
        body: {
          name: params.name,
          target_amount: params.target_amount,
          target_date: params.target_date,
          daily_transfer_enabled: params.daily_transfer_enabled,
          account_id: params.account_id
        }
      });
      
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create goal with recurring transfers');
      }
      
      // Track event
      trackEvent('solo_goal_created_with_recurring', { 
        goal_id: data.goal_id,
        recurring_transfer_id: data.recurring_transfer_id,
        daily_amount: data.daily_amount
      });
      
      toast.success(`Goal "${params.name}" created with daily transfers`);
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data;
    } catch (error: any) {
      console.error('Error creating goal with recurring transfers:', error);
      const errorMessage = error?.message || 'Failed to create goal with recurring transfers';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };
  
  // Start a goal with recurring transfers (DEPRECATED - use createGoalWithRecurring for new goals)
  const startGoal = async (goalId: string, accountId: string) => {
    if (!user) {
      toast.error('You must be logged in to start a goal');
      return null;
    }
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-solo-goal', {
        body: { goal_id: goalId, account_id: accountId }
      });
      
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to start goal');
      }
      
      // Track event
      trackEvent('solo_goal_started', { 
        goal_id: goalId,
        recurring_transfer_id: data.recurring_transfer_id,
        daily_amount: data.daily_amount
      });
      
      toast.success('Recurring transfers set up successfully');
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data;
    } catch (error: any) {
      console.error('Error starting goal:', error);
      toast.error(error.message || 'Failed to set up recurring transfers');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    goals,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isProcessing,
    fetchGoalById,
    createGoal,
    createGoalWithRecurring,
    updateGoal,
    fetchTodayAllocation,
    processGoalManually,
    addManualDeposit,
    deleteGoal,
    startGoal
  };
};
