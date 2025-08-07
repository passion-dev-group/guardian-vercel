
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { Separator } from '@/components/ui/separator';

interface NotificationSetting {
  name: string;
  id: string;
  description: string;
  enabledByDefault: boolean;
  key: 'payout_reminder' | 'contribution_reminder' | 'circle_updates';
}

const settings: NotificationSetting[] = [
  {
    name: 'Payout reminders',
    id: 'payout_reminder',
    description: 'Get notified 3 days before your turn to receive a payout',
    enabledByDefault: true,
    key: 'payout_reminder'
  },
  {
    name: 'Contribution reminders',
    id: 'contribution_reminder',
    description: 'Get notified when your monthly contribution is due',
    enabledByDefault: true,
    key: 'contribution_reminder'
  },
  {
    name: 'Circle updates',
    id: 'circle_updates',
    description: 'Get notified about important updates in your circles',
    enabledByDefault: true,
    key: 'circle_updates'
  }
];

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!user) return;
    
    async function fetchPreferences() {
      try {
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .is('circle_id', null);
        
        if (error) throw error;
        
        // Initialize with default preferences
        const defaultPrefs: Record<string, boolean> = {};
        settings.forEach(setting => {
          defaultPrefs[setting.key] = setting.enabledByDefault;
        });
        
        // Update with stored preferences
        if (data && data.length > 0) {
          data.forEach(pref => {
            defaultPrefs[pref.type] = pref.enabled;
          });
        }
        
        setPreferences(defaultPrefs);
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notification preferences',
          variant: 'destructive',
        });
      }
    }
    
    fetchPreferences();
  }, [user, toast]);
  
  const updatePreference = async (key: string, enabled: boolean) => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      // Use upsert to handle both insert and update in one operation
      const { error } = await supabase
        .from('user_notifications')
        .upsert({ 
          user_id: user.id,
          type: key,
          enabled,
          circle_id: null,
          scheduled_for: new Date().toISOString(), // This will be updated by the scheduler
        }, {
          onConflict: 'user_id,type,circle_id'
        });
      
      if (error) throw error;
      
      // Update local state
      setPreferences(prev => ({
        ...prev,
        [key]: enabled
      }));
      
      // Track analytics
      trackEvent('notification_preference_updated', {
        preference: key,
        enabled,
      });
      
      toast({
        title: 'Preference updated',
        description: enabled 
          ? `You will now receive ${key.replace('_', ' ')}s` 
          : `You will no longer receive ${key.replace('_', ' ')}s`,
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notification Settings</CardTitle>
        </div>
        <CardDescription>Manage how and when we notify you</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <Label htmlFor={setting.id} className="font-medium text-base">
                    {setting.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <Switch
                  id={setting.id}
                  checked={preferences[setting.key] ?? setting.enabledByDefault}
                  onCheckedChange={(checked) => updatePreference(setting.key, checked)}
                  disabled={loading[setting.key]}
                />
              </div>
              <Separator className="mt-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
