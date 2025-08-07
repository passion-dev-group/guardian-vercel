
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import { trackEvent } from '@/lib/analytics';

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.coerce.number().positive('Amount must be positive'),
  target_date: z.date().optional(),
  daily_transfer_enabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SoloGoalFormProps {
  goalId?: string;
  onComplete?: () => void;
}

export default function SoloGoalForm({ goalId, onComplete }: SoloGoalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createGoal, updateGoal, fetchGoalById, goals } = useSoloSavingsGoals();

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
      } else {
        // Create new goal
        // Fix: Ensure all required properties are explicitly provided
        await createGoal({
          name: data.name, // Explicitly providing the required name property
          target_amount: data.target_amount, // Explicitly providing the required target_amount property
          target_date: data.target_date ? format(data.target_date, 'yyyy-MM-dd') : undefined,
          daily_transfer_enabled: data.daily_transfer_enabled
        });
        
        trackEvent('solo_goal_created', {
          ...data,
        });
      }
      
      onComplete?.();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : goalId ? "Update Goal" : "Create Goal"}
        </Button>
      </form>
    </Form>
  );
}
