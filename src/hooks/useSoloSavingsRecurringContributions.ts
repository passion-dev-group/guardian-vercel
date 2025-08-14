import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface SoloSavingsRecurringContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  day_of_month?: number; // 1-31
  is_active: boolean;
  next_contribution_date: string;
  created_at: string;
  updated_at: string;
}

interface CreateRecurringContributionParams {
  goal_id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
}

export const useSoloSavingsRecurringContributions = (goalId?: string) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch recurring contributions for a specific goal or all user's goals
  const { data: contributions, isLoading, error } = useQuery({
    queryKey: ['soloSavingsRecurringContributions', goalId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('solo_savings_recurring_contributions')
        .select('*')
        .eq('user_id', user.id);
      
      if (goalId) {
        query = query.eq('goal_id', goalId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching recurring contributions:', error);
        throw error;
      }
      
      return data as SoloSavingsRecurringContribution[];
    },
    enabled: !!user
  });

  // Create a new recurring contribution
  const createContribution = async (params: CreateRecurringContributionParams) => {
    if (!user) {
      toast.error('You must be logged in to create a recurring contribution');
      return null;
    }
    
    setIsCreating(true);
    try {
      // Calculate next contribution date
      const nextDate = calculateNextContributionDate(
        params.frequency,
        params.day_of_week,
        params.day_of_month
      );
      
      const { data, error } = await supabase
        .from('solo_savings_recurring_contributions')
        .insert({
          ...params,
          user_id: user.id,
          next_contribution_date: nextDate.toISOString(),
          is_active: true
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating recurring contribution:', error);
        throw error;
      }
      
      // Track event
      trackEvent('solo_savings_recurring_contribution_created', {
        goal_id: params.goal_id,
        amount: params.amount,
        frequency: params.frequency
      });
      
      toast.success('Recurring contribution created successfully');
      queryClient.invalidateQueries({ queryKey: ['soloSavingsRecurringContributions'] });
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      return data as SoloSavingsRecurringContribution;
    } catch (error) {
      console.error('Error creating recurring contribution:', error);
      toast.error('Failed to create recurring contribution');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  // Update an existing recurring contribution
  const updateContribution = async (params: {
    id: string;
    amount?: number;
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
    is_active?: boolean;
  }) => {
    const { id, ...updateData } = params;
    setIsUpdating(true);
    try {
      // If frequency or timing changed, recalculate next contribution date
      if (updateData.frequency || updateData.day_of_week !== undefined || updateData.day_of_month !== undefined) {
        const currentContribution = contributions?.find(c => c.id === id);
        if (currentContribution) {
          const nextDate = calculateNextContributionDate(
            updateData.frequency || currentContribution.frequency,
            updateData.day_of_week !== undefined ? updateData.day_of_week : currentContribution.day_of_week,
            updateData.day_of_month !== undefined ? updateData.day_of_month : currentContribution.day_of_month
          );
          // Add next_contribution_date to the update data
          (updateData as any).next_contribution_date = nextDate.toISOString();
        }
      }
      
      const { data, error } = await supabase
        .from('solo_savings_recurring_contributions')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Track event
      trackEvent('solo_savings_recurring_contribution_updated', { 
        contribution_id: id,
        ...updateData
      });
      
      toast.success('Recurring contribution updated successfully');
      queryClient.invalidateQueries({ queryKey: ['soloSavingsRecurringContributions'] });
      return data as SoloSavingsRecurringContribution;
    } catch (error) {
      console.error('Error updating recurring contribution:', error);
      toast.error('Failed to update recurring contribution');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete a recurring contribution
  const deleteContribution = async (contributionId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete a recurring contribution');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('solo_savings_recurring_contributions')
        .delete()
        .eq('id', contributionId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error deleting recurring contribution:', error);
        throw error;
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['soloSavingsRecurringContributions'] });
      queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      
      toast.success('Recurring contribution deleted successfully');
      
      // Track event
      trackEvent('solo_savings_recurring_contribution_deleted', {
        contribution_id: contributionId
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting recurring contribution:', error);
      toast.error('Failed to delete recurring contribution');
      return false;
    }
  };

  // Manually trigger Plaid transfer processing (for testing)
  const triggerPlaidTransfer = async (goalId?: string) => {
    if (!user) {
      toast.error('You must be logged in to trigger transfers');
      return false;
    }
    
    try {
      console.log('Triggering Plaid transfer processing...');
      
      // Call the new Edge Function
      const response = await fetch('/api/solo-savings-plaid-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          goal_id: goalId,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Plaid transfer processing result:', result);
      
      if (result.successful > 0) {
        toast.success(`Successfully processed ${result.successful} contribution(s)`);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['soloSavingsRecurringContributions'] });
        queryClient.invalidateQueries({ queryKey: ['soloSavingsGoals'] });
      } else if (result.failed > 0) {
        toast.error(`Failed to process ${result.failed} contribution(s). Check console for details.`);
      } else {
        toast.info('No contributions were processed');
      }
      
      return true;
    } catch (error) {
      console.error('Error triggering Plaid transfer:', error);
      toast.error('Failed to trigger Plaid transfer processing');
      return false;
    }
  };

  return {
    contributions,
    isLoading,
    error,
    isCreating,
    isUpdating,
    createContribution,
    updateContribution,
    deleteContribution,
    triggerPlaidTransfer // New function for testing
  };
};

// Helper function to calculate next contribution date
function calculateNextContributionDate(
  frequency: 'weekly' | 'biweekly' | 'monthly',
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const nextDate = new Date(now);

  switch (frequency) {
    case 'weekly':
      if (dayOfWeek !== undefined) {
        const currentDay = now.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        nextDate.setDate(now.getDate() + daysToAdd);
      } else {
        nextDate.setDate(now.getDate() + 7);
      }
      break;

    case 'biweekly':
      if (dayOfWeek !== undefined) {
        const currentDay = now.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 14) % 14;
        nextDate.setDate(now.getDate() + daysToAdd);
      } else {
        nextDate.setDate(now.getDate() + 14);
      }
      break;

    case 'monthly':
      if (dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
      } else {
        nextDate.setMonth(now.getMonth() + 1);
      }
      break;
  }

  return nextDate;
}
