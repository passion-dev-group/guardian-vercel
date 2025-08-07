
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
  is_active: boolean;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateSavingsGoalParams {
  name: string;
  target_amount: number;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
}

interface UpdateSavingsGoalParams {
  id: string;
  name?: string;
  target_amount?: number;
  allocation_type?: 'percentage' | 'fixed';
  allocation_value?: number;
  is_active?: boolean;
  target_date?: string | null;
}

interface AddManualDepositParams {
  goal_id: string;
  amount: number;
}

export const useSavingsGoals = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get the authenticated user
  
  // Fetch all savings goals for the current user
  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching savings goals:', error);
        throw error;
      }
      return data as SavingsGoal[];
    },
    enabled: !!user // Only run query when user is authenticated
  });
  
  // Create a new savings goal
  const createGoal = async (goalData: CreateSavingsGoalParams) => {
    if (!user) {
      toast.error('You must be logged in to create a goal');
      return null;
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          ...goalData,
          current_amount: 0,
          user_id: user.id // Explicitly set the user_id to the authenticated user
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating savings goal:', error);
        throw error;
      }
      
      // Track event
      trackEvent('savings_goal_created', {
        goal_name: goalData.name,
        target_amount: goalData.target_amount
      });
      
      toast.success(`Goal "${goalData.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      return data;
    } catch (error) {
      console.error('Error creating savings goal:', error);
      toast.error('Failed to create savings goal');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };
  
  // Update an existing savings goal
  const updateGoal = async (params: UpdateSavingsGoalParams) => {
    const { id, ...updateData } = params;
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      if ('is_active' in updateData) {
        if (updateData.is_active === false) {
          trackEvent('savings_goal_paused', { goal_id: id });
          toast.info('Goal paused successfully');
        } else {
          trackEvent('savings_goal_resumed', { goal_id: id });
          toast.success('Goal resumed successfully');
        }
      } else {
        toast.success('Goal updated successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      return data;
    } catch (error) {
      console.error('Error updating savings goal:', error);
      toast.error('Failed to update savings goal');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Add a manual deposit to a goal
  const addManualDeposit = async ({ goal_id, amount }: AddManualDepositParams) => {
    setIsDepositing(true);
    try {
      // Find the current goal to update its amount
      const goal = goals?.find(g => g.id === goal_id);
      if (!goal) {
        throw new Error('Goal not found');
      }
      
      // Update the goal's current amount
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({
          current_amount: goal.current_amount + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal_id);
        
      if (updateError) throw updateError;
      
      // Create a record in automated_savings for tracking
      const { error: insertError } = await supabase
        .from('automated_savings')
        .insert({
          goal_id,
          amount,
          scheduled_for: new Date().toISOString(),
          executed_at: new Date().toISOString(),
          status: 'completed'
        });
        
      if (insertError) throw insertError;
      
      // Track event
      trackEvent('manual_deposit', {
        goal_id,
        amount
      });
      
      toast.success(`Added $${amount.toFixed(2)} to your goal`);
      queryClient.invalidateQueries({ queryKey: ['savingsGoals'] });
      return true;
    } catch (error) {
      console.error('Error making manual deposit:', error);
      toast.error('Failed to add deposit');
      throw error;
    } finally {
      setIsDepositing(false);
    }
  };
  
  return {
    goals,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDepositing,
    createGoal,
    updateGoal,
    addManualDeposit
  };
};
