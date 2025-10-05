
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import { useLinkedBankAccounts } from '@/hooks/useLinkedBankAccounts';
import PlaidLinkButton from '@/components/bank-linking/PlaidLinkButton';
import { trackEvent } from '@/lib/analytics';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.coerce.number().positive('Amount must be positive'),
  target_date: z.date().optional(),
  daily_transfer_enabled: z.boolean().default(true),
  account_id: z.string().optional(),
}).refine((data) => {
  // If daily transfers are enabled, account_id is required
  if (data.daily_transfer_enabled) {
    return !!data.account_id;
  }
  return true;
}, {
  message: "Bank account is required when daily transfers are enabled",
  path: ["account_id"],
});

type FormValues = z.infer<typeof formSchema>;

interface SoloGoalFormProps {
  goalId?: string;
  onComplete?: () => void;
}

export default function SoloGoalForm({ goalId, onComplete }: SoloGoalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createGoal, updateGoal, fetchGoalById, goals, createGoalWithRecurring } = useSoloSavingsGoals();
  const { accounts, loading: accountsLoading, refreshAccounts } = useLinkedBankAccounts();

  // Find the goal if it exists
  const existingGoal = goalId ? goals?.find(g => g.id === goalId) : undefined;
  
  // Default values
  const defaultValues: Partial<FormValues> = {
    name: existingGoal?.name || '',
    target_amount: existingGoal?.target_amount || 0,
    target_date: existingGoal?.target_date ? new Date(existingGoal.target_date) : addMonths(new Date(), 3),
    daily_transfer_enabled: existingGoal?.daily_transfer_enabled ?? true,
  };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      if (goalId && existingGoal) {
        // Update existing goal
        await updateGoal({
          id: goalId,
          ...data,
          target_date: data.target_date ? format(data.target_date, 'yyyy-MM-dd') : null,
        });
        
        trackEvent('solo_goal_updated', {
          goal_id: goalId,
          ...data,
        });
        onComplete?.();
      } else {
        // Create new goal
        if (data.daily_transfer_enabled && data.account_id) {
          // If daily transfers enabled, use the integrated endpoint that creates transfer FIRST
          await createGoalWithRecurring({
            name: data.name,
            target_amount: data.target_amount,
            target_date: data.target_date ? format(data.target_date, 'yyyy-MM-dd') : undefined,
            daily_transfer_enabled: true,
            account_id: data.account_id
          });
        } else {
          // If daily transfers disabled, just create the goal
          await createGoal({
            name: data.name,
            target_amount: data.target_amount,
            target_date: data.target_date ? format(data.target_date, 'yyyy-MM-dd') : undefined,
            daily_transfer_enabled: false
          });
        }
        
        trackEvent('solo_goal_created', {
          ...data,
        });
        
        onComplete?.();
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful bank linking
  const handleBankLinked = async () => {
    await refreshAccounts();
    trackEvent('bank_linked_from_goal_form');
  };

  // Watch daily_transfer_enabled to show/hide bank selection
  const dailyTransferEnabled = form.watch('daily_transfer_enabled');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Emergency Fund" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    step="0.01" 
                    placeholder="1000.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Target Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                      >
                        {field.value ? (
                          format(field.value, "PP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="daily_transfer_enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Enable Daily Automated Transfers
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Automatically calculate and save a small amount each day
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {dailyTransferEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Bank Authorization Required
                </div>
                <div className="text-sm text-muted-foreground">
                  Select which bank account will be used for automatic daily transfers.
                </div>
              </div>

              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={accountsLoading ? "Loading accounts..." : "Select a bank account"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountsLoading ? (
                          <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                        ) : accounts && accounts.length > 0 ? (
                          accounts.map((account) => (
                            <SelectItem key={account.id} value={account.account_id}>
                              {account.institution_name} - {account.account_name} (****{account.mask})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No bank accounts linked</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Daily transfers will be automatically deducted from this account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PlaidLinkButton 
                onSuccess={handleBankLinked}
                variant="outline"
                className="w-full"
              >
                {accounts && accounts.length > 0 ? "Link Another Bank Account" : "Link Bank Account"}
              </PlaidLinkButton>
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || (dailyTransferEnabled && !form.watch('account_id'))}
        >
          {isLoading ? "Saving..." : goalId ? "Update Goal" : "Create Goal"}
        </Button>
      </form>
    </Form>
  );
}
