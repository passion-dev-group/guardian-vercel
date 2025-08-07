import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface SavingsPreferences {
  user_id: string;
  max_monthly_limit: number;
  transfer_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  vacation_mode: boolean;
  next_transfer_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdatePreferencesParams {
  max_monthly_limit?: number;
  transfer_frequency?: 'weekly' | 'bi-weekly' | 'monthly';
  vacation_mode?: boolean;
}

export const useSavingsPreferences = () => {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch user's savings preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['savingsPreferences', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('savings_preferences')
        .select('user_id, max_monthly_limit, transfer_frequency, vacation_mode, next_transfer_date, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching savings preferences:', error);
        // If no preferences exist yet, return default values
        if (error.code === 'PGRST116') {
          return {
            user_id: user.id,
            max_monthly_limit: 100,
            transfer_frequency: 'monthly' as const,
            vacation_mode: false,
            next_transfer_date: null,
            created_at: '',
            updated_at: ''
          } as SavingsPreferences;
        }
        throw error;
      }
      
      // If no data found, return default values
      if (!data) {
        return {
          user_id: user.id,
          max_monthly_limit: 100,
          transfer_frequency: 'monthly' as const,
          vacation_mode: false,
          next_transfer_date: null,
          created_at: '',
          updated_at: ''
        } as SavingsPreferences;
      }
      
      return data as SavingsPreferences;
    },
    enabled: !!user?.id
  });

  // Update savings preferences
  const updatePreferences = async (updatedPrefs: UpdatePreferencesParams) => {
    setIsSaving(true);
    try {
      if (!user?.id) throw new Error('No user');
      
      // Use upsert to handle both insert and update cases
      const { data, error } = await supabase
        .from('savings_preferences')
        .upsert({
          user_id: user.id,
          max_monthly_limit: updatedPrefs.max_monthly_limit ?? 100,
          transfer_frequency: updatedPrefs.transfer_frequency ?? 'monthly',
          vacation_mode: updatedPrefs.vacation_mode ?? false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select('user_id, max_monthly_limit, transfer_frequency, vacation_mode, next_transfer_date, created_at, updated_at')
        .single();
      
      if (error) throw error;
      
      // Track event
      trackEvent('savings_preferences_updated', {
        max_monthly_limit: updatedPrefs.max_monthly_limit,
        transfer_frequency: updatedPrefs.transfer_frequency,
        vacation_mode: updatedPrefs.vacation_mode
      });
      
      toast.success('Savings preferences updated successfully');
      queryClient.invalidateQueries({ queryKey: ['savingsPreferences', user.id] });
      return data;
    } catch (error) {
      console.error('Error updating savings preferences:', error);
      toast.error('Failed to update savings preferences');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences
  };
};
