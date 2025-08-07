
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

interface SettingsCardProps {
  goalId: string;
  dailyTransferEnabled: boolean;
  updateGoal: (params: { id: string; daily_transfer_enabled: boolean }) => Promise<any>;
  isUpdating: boolean;
}

export function SettingsCard({ 
  goalId, 
  dailyTransferEnabled, 
  updateGoal, 
  isUpdating 
}: SettingsCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleToggleDailyTransfers = async () => {
    try {
      await updateGoal({
        id: goalId,
        daily_transfer_enabled: !dailyTransferEnabled
      });
      
      trackEvent('solo_goal_updated', {
        goal_id: goalId,
        daily_transfer_enabled: !dailyTransferEnabled
      });
      
      toast({
        title: 'Success',
        description: dailyTransferEnabled
          ? 'Daily transfers have been disabled'
          : 'Daily transfers have been enabled'
      });
    } catch (error) {
      console.error('Error toggling daily transfers:', error);
      toast({
        title: 'Error',
        description: 'Could not update goal settings',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-base font-medium">
              Daily Automated Transfers
            </label>
            <p className="text-sm text-muted-foreground">
              Automatically calculate and save a small amount each day
            </p>
          </div>
          <Switch 
            checked={dailyTransferEnabled} 
            onCheckedChange={handleToggleDailyTransfers}
            disabled={isUpdating}
          />
        </div>
        
        <Separator />
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => navigate('/savings-goals')}
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Back to All Goals
        </Button>
      </CardContent>
    </Card>
  );
}
