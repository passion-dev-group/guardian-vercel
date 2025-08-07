
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSavingsPreferences } from '@/hooks/useSavingsPreferences';
import { toast } from 'sonner';
import React from 'react';

export default function SavingsSettings() {
  const { preferences, isLoading, isSaving, updatePreferences } = useSavingsPreferences();
  const [maxMonthlyLimit, setMaxMonthlyLimit] = useState<number | undefined>(undefined);
  const [vacationMode, setVacationMode] = useState<boolean | undefined>(undefined);
  const [transferFrequency, setTransferFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly' | undefined>(undefined);

  // Update local state when preferences are loaded
  React.useEffect(() => {
    if (preferences) {
      setMaxMonthlyLimit(preferences.max_monthly_limit);
      setVacationMode(preferences.vacation_mode);
      setTransferFrequency(preferences.transfer_frequency);
    }
  }, [preferences]);

  const handleSavePreferences = async () => {
    try {
      await updatePreferences({
        max_monthly_limit: maxMonthlyLimit,
        vacation_mode: vacationMode,
        transfer_frequency: transferFrequency
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  if (isLoading || maxMonthlyLimit === undefined || vacationMode === undefined || transferFrequency === undefined) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Automated Savings Settings</h3>
        <p className="text-sm text-muted-foreground">
          Control how and when your automatic transfers occur
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="max-monthly-limit">Maximum Monthly Transfer Limit</Label>
          <div className="pt-2">
            <Slider
              id="max-monthly-limit"
              value={[maxMonthlyLimit]}
              onValueChange={(value) => setMaxMonthlyLimit(value[0])}
              min={25}
              max={500}
              step={25}
              className="mb-2"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$25</span>
            <span>${maxMonthlyLimit}</span>
            <span>$500</span>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            The maximum amount that will be transferred to all your goals each month
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="transfer-frequency">Transfer Frequency</Label>
          <Select 
            value={transferFrequency} 
            onValueChange={(value) => setTransferFrequency(value as 'weekly' | 'bi-weekly' | 'monthly')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Frequency</SelectLabel>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            How often automated transfers will occur
          </p>
        </div>
        
        <div className="flex items-center justify-between space-y-0 rounded-md border p-4">
          <div>
            <Label htmlFor="vacation-mode" className="text-base">Vacation Mode</Label>
            <p className="text-sm text-muted-foreground">
              Temporarily pause all automated transfers
            </p>
          </div>
          <Switch
            id="vacation-mode"
            checked={vacationMode}
            onCheckedChange={setVacationMode}
          />
        </div>
      </div>
      
      <Button 
        onClick={handleSavePreferences}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
