import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  RecurringContributionWithDetails,
  CreateRecurringContributionData,
  UpdateRecurringContributionData,
  RecurringContributionsResponse
} from '@/types/transactions';

export function useRecurringContributions() {
  const { user } = useAuth();
  const [recurringContributions, setRecurringContributions] = useState<RecurringContributionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    activeCount: 0,
    pausedCount: 0,
    overdueCount: 0,
  });

  const fetchRecurringContributions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('recurring_contributions')
        .select(`
          *,
          circle:circles(id, name, contribution_amount, frequency),
          user:profiles!recurring_contributions_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('next_contribution_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data and calculate status
      const transformedContributions: RecurringContributionWithDetails[] = (data || []).map(rc => {
        const now = new Date();
        const nextDate = new Date(rc.next_contribution_date);
        const isOverdue = nextDate < now && rc.is_active;
        
        let status: 'active' | 'paused' | 'overdue' = 'active';
        if (!rc.is_active) {
          status = 'paused';
        } else if (isOverdue) {
          status = 'overdue';
        }

        return {
          ...rc,
          circle: rc.circle,
          user: rc.user,
          next_contribution_date_formatted: nextDate.toLocaleDateString(),
          status,
        };
      });

      setRecurringContributions(transformedContributions);

      // Calculate stats
      const newStats = {
        total: transformedContributions.length,
        activeCount: transformedContributions.filter(rc => rc.status === 'active').length,
        pausedCount: transformedContributions.filter(rc => rc.status === 'paused').length,
        overdueCount: transformedContributions.filter(rc => rc.status === 'overdue').length,
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error fetching recurring contributions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recurring contributions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createRecurringContribution = useCallback(async (data: CreateRecurringContributionData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Calculate next contribution date based on frequency
      const nextDate = calculateNextContributionDate(data.frequency, data.day_of_week, data.day_of_month);

      const { data: newRecurringContribution, error: createError } = await supabase
        .from('recurring_contributions')
        .insert({
          user_id: user.id,
          circle_id: data.circle_id,
          amount: data.amount,
          frequency: data.frequency,
          day_of_week: data.day_of_week,
          day_of_month: data.day_of_month,
          next_contribution_date: nextDate.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Refresh the list
      await fetchRecurringContributions();

      return newRecurringContribution;
    } catch (err) {
      console.error('Error creating recurring contribution:', err);
      throw err;
    }
  }, [user, fetchRecurringContributions]);

  const updateRecurringContribution = useCallback(async (
    id: string, 
    data: UpdateRecurringContributionData
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updateData: any = { ...data };

      // If frequency or day settings changed, recalculate next date
      if (data.frequency || data.day_of_week !== undefined || data.day_of_month !== undefined) {
        const current = recurringContributions.find(rc => rc.id === id);
        if (current) {
          const frequency = data.frequency || current.frequency;
          const dayOfWeek = data.day_of_week !== undefined ? data.day_of_week : current.day_of_week;
          const dayOfMonth = data.day_of_month !== undefined ? data.day_of_month : current.day_of_month;
          
          updateData.next_contribution_date = calculateNextContributionDate(
            frequency, 
            dayOfWeek, 
            dayOfMonth
          ).toISOString();
        }
      }

      const { data: updatedRecurringContribution, error: updateError } = await supabase
        .from('recurring_contributions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Refresh the list
      await fetchRecurringContributions();

      return updatedRecurringContribution;
    } catch (err) {
      console.error('Error updating recurring contribution:', err);
      throw err;
    }
  }, [user, recurringContributions, fetchRecurringContributions]);

  const deleteRecurringContribution = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error: deleteError } = await supabase
        .from('recurring_contributions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh the list
      await fetchRecurringContributions();
    } catch (err) {
      console.error('Error deleting recurring contribution:', err);
      throw err;
    }
  }, [user, fetchRecurringContributions]);

  const toggleRecurringContribution = useCallback(async (id: string) => {
    const current = recurringContributions.find(rc => rc.id === id);
    if (!current) return;

    await updateRecurringContribution(id, { is_active: !current.is_active });
  }, [recurringContributions, updateRecurringContribution]);

  const refresh = useCallback(() => {
    fetchRecurringContributions();
  }, [fetchRecurringContributions]);

  // Initial fetch
  useEffect(() => {
    fetchRecurringContributions();
  }, [fetchRecurringContributions]);

  return {
    recurringContributions,
    loading,
    error,
    stats,
    createRecurringContribution,
    updateRecurringContribution,
    deleteRecurringContribution,
    toggleRecurringContribution,
    refresh,
  };
}

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
        // Set to next occurrence of the specified day of week
        const currentDay = now.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        nextDate.setDate(now.getDate() + daysToAdd);
      } else {
        // Default to next week
        nextDate.setDate(now.getDate() + 7);
      }
      break;

    case 'biweekly':
      if (dayOfWeek !== undefined) {
        // Set to next occurrence of the specified day of week, 2 weeks from now
        const currentDay = now.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 14) % 14;
        nextDate.setDate(now.getDate() + daysToAdd);
      } else {
        // Default to 2 weeks from now
        nextDate.setDate(now.getDate() + 14);
      }
      break;

    case 'monthly':
      if (dayOfMonth !== undefined) {
        // Set to next occurrence of the specified day of month
        nextDate.setDate(dayOfMonth);
        if (nextDate <= now) {
          // If this month's date has passed, move to next month
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
      } else {
        // Default to next month
        nextDate.setMonth(now.getMonth() + 1);
      }
      break;
  }

  return nextDate;
} 