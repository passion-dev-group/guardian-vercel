
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  updated_at?: string;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    sms_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch notification preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Use a more explicit query structure
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('email_enabled, sms_enabled, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching notification preferences:', error);
          // If it's a not found error, we'll use defaults
          if (error.code === 'PGRST116') {
            console.log('No notification preferences found, using defaults');
            return;
          }
          throw error;
        }
        
        if (data) {
          setPreferences({
            email_enabled: data.email_enabled ?? true,
            sms_enabled: data.sms_enabled ?? false,
            updated_at: data.updated_at,
          });
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPreferences();
  }, [user]);

  // Save notification preferences
  const savePreferences = async (newPreferences: { email_enabled: boolean; sms_enabled: boolean }) => {
    if (!user) return false;
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          email_enabled: newPreferences.email_enabled,
          sms_enabled: newPreferences.sms_enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      setPreferences({
        ...newPreferences,
        updated_at: new Date().toISOString(),
      });
      
      trackEvent('preferences_saved', { 
        email_enabled: newPreferences.email_enabled,
        sms_enabled: newPreferences.sms_enabled,
      });
      
      toast.success('Notification preferences saved');
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save notification preferences');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
  };
};
