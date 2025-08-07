
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Goal name must be at least 2 characters' }).max(50),
  target_amount: z.number().min(10, { message: 'Goal must be at least $10' }).max(1000000),
  allocation_type: z.enum(['percentage', 'fixed']),
  allocation_value: z.number().min(1),
});

interface GoalFormProps {
  onComplete: () => void;
}

export default function GoalForm({ onComplete }: GoalFormProps) {
  const [allocationType, setAllocationType] = useState<'percentage' | 'fixed'>('percentage');
  const { createGoal, isCreating } = useSavingsGoals();
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      target_amount: 1000,
      allocation_type: 'percentage',
      allocation_value: 10,
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to create a goal');
      return;
    }

    try {
      await createGoal({
        name: values.name,
        target_amount: values.target_amount,
        allocation_type: values.allocation_type,
        allocation_value: values.allocation_value,
      });
      onComplete();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      // Show detailed error message
      if (error.message) {
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'percentage' || value === 'fixed') {
      setAllocationType(value);
      form.setValue('allocation_type', value);
      
      // Default values for each type
      if (value === 'percentage') {
        form.setValue('allocation_value', 10); // 10%
      } else {
        form.setValue('allocation_value', 25); // $25
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Create a Savings Goal</h2>
        <p className="text-sm text-muted-foreground">
          Set up a new savings goal to start automating your savings.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goal Name</FormLabel>
                <FormControl>
                  <Input placeholder="Vacation Fund" {...field} />
                </FormControl>
                <FormDescription>
                  Give your goal a meaningful name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="target_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2">$</span>
                    <Input
                      type="number"
                      className="pl-6"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  How much are you saving for?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="space-y-2">
            <FormLabel>Contribution Method</FormLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={allocationType}
              onValueChange={handleTypeChange}
              className="justify-start"
            >
              <ToggleGroupItem value="percentage">Percentage</ToggleGroupItem>
              <ToggleGroupItem value="fixed">Fixed Amount</ToggleGroupItem>
            </ToggleGroup>
            <FormDescription>
              How would you like to allocate funds to this goal?
            </FormDescription>
          </div>
          
          <FormField
            control={form.control}
            name="allocation_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {allocationType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2">
                      {allocationType === 'percentage' ? '%' : '$'}
                    </span>
                    <Input
                      type="number"
                      className="pl-6"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  {allocationType === 'percentage'
                    ? 'Percentage of each automatic savings transfer'
                    : 'Fixed amount for each automatic savings transfer'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="pt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onComplete}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
