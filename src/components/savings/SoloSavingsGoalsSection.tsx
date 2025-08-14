import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Target, Plus, PiggyBank, Calendar, Settings, DollarSign } from 'lucide-react';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import { useSoloSavingsRecurringContributions } from '@/hooks/useSoloSavingsRecurringContributions';
import SoloGoalForm from './SoloGoalForm';
import { format } from 'date-fns';

export default function SoloSavingsGoalsSection() {
  const { goals: soloGoals, isLoading: isLoadingGoals } = useSoloSavingsGoals();
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);

  // Calculate summary statistics
  const totalTarget = soloGoals?.reduce((sum, goal) => sum + goal.target_amount, 0) || 0;
  const totalCurrent = soloGoals?.reduce((sum, goal) => sum + goal.current_amount, 0) || 0;
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <>
      <section aria-labelledby="solo-savings-heading" className="bg-card rounded-lg shadow">
        <div className="p-6">
          <h2 id="solo-savings-heading" className="text-xl font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Solo Savings Goals
          </h2>
          
          {/* Summary Section */}
          {!isLoadingGoals && soloGoals.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Target</p>
                  <p className="text-lg font-semibold">${totalTarget.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-lg font-semibold text-green-600">${totalCurrent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <p className="text-lg font-semibold">{Math.round(overallProgress)}%</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(overallProgress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <Button
              onClick={() => setCreateGoalDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Goal
            </Button>
            {isLoadingGoals ? (
              <p className="text-sm text-muted-foreground">Loading goals...</p>
            ) : soloGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No solo savings goals yet. Create one!</p>
            ) : (
              <div className="mt-4 space-y-4">
                {soloGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Create Solo Goal Dialog */}
      <Dialog open={createGoalDialogOpen} onOpenChange={setCreateGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Solo Savings Goal</DialogTitle>
            <DialogDescription>
              Define a target amount and name for your solo savings goal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SoloGoalForm onComplete={() => setCreateGoalDialogOpen(false)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGoalDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate component for each goal card with recurring contributions setup
function GoalCard({ goal }: { goal: any }) {
  const { updateGoal } = useSoloSavingsGoals();
  const { contributions, createContribution, updateContribution, deleteContribution, triggerPlaidTransfer } = useSoloSavingsRecurringContributions(goal.id);
  const [showRecurringSetup, setShowRecurringSetup] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurringDay, setRecurringDay] = useState('1'); // Default to day 1 for monthly, will be updated when frequency changes

  // Update day when frequency changes
  const handleFrequencyChange = (newFrequency: 'weekly' | 'biweekly' | 'monthly') => {
    setRecurringFrequency(newFrequency);
    if (newFrequency === 'monthly') {
      setRecurringDay('1'); // Default to 1st of month
    } else {
      setRecurringDay('1'); // Default to Monday
    }
  };

  const handleToggleDailyTransfers = async () => {
    try {
      await updateGoal({
        id: goal.id,
        daily_transfer_enabled: !goal.daily_transfer_enabled
      });
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  // Test function to manually trigger Plaid transfer processing
  const handleTestPlaidTransfer = async () => {
    try {
      await triggerPlaidTransfer(goal.id);
    } catch (error) {
      console.error('Error testing Plaid transfer:', error);
    }
  };

  const handleSetupRecurringContribution = async () => {
    console.log('Setting up recurring contribution...');
    console.log('Amount:', recurringAmount);
    console.log('Frequency:', recurringFrequency);
    console.log('Day:', recurringDay);

    if (!recurringAmount || parseFloat(recurringAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!recurringDay) {
      alert('Please select a day');
      return;
    }

    try {
      const dayValue = parseInt(recurringDay);
      
      if (isNaN(dayValue)) {
        alert('Please select a valid day');
        return;
      }

      const contributionData = {
        goal_id: goal.id,
        amount: parseFloat(recurringAmount),
        frequency: recurringFrequency,
        day_of_week: recurringFrequency !== 'monthly' ? dayValue : undefined,
        day_of_month: recurringFrequency === 'monthly' ? dayValue : undefined
      };

      console.log('Creating recurring contribution:', contributionData);
      console.log('Goal ID:', goal.id);
      console.log('User context available:', !!contributions);

      await createContribution(contributionData);

      console.log('Recurring contribution created successfully!');
      setShowRecurringSetup(false);
      setRecurringAmount('');
      setRecurringDay(recurringFrequency === 'monthly' ? '1' : '1');
    } catch (error) {
      console.error('Error setting up recurring contribution:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        goal: goal,
        contributionData: {
          amount: recurringAmount,
          frequency: recurringFrequency,
          day: recurringDay
        }
      });
      alert(`Failed to setup recurring contribution: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const existingContribution = contributions?.[0];

  // Reset form when dialog opens
  const handleOpenRecurringSetup = () => {
    if (existingContribution) {
      // Edit mode - populate with existing values
      setRecurringAmount(existingContribution.amount.toString());
      setRecurringFrequency(existingContribution.frequency);
      if (existingContribution.day_of_month) {
        setRecurringDay(existingContribution.day_of_month.toString());
      } else if (existingContribution.day_of_week !== undefined) {
        setRecurringDay(existingContribution.day_of_week.toString());
      }
    } else {
      // New setup - use defaults
      setRecurringAmount('');
      setRecurringFrequency('weekly');
      setRecurringDay('1');
    }
    setShowRecurringSetup(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {goal.name}
            </CardTitle>
            <CardDescription>
              Target: ${goal.target_amount.toFixed(2)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Savings:</span>
              <span className="font-medium">${goal.current_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">${goal.target_amount.toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round((goal.current_amount / goal.target_amount) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recurring Contributions Section */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Recurring Contributions</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestPlaidTransfer}
                  className="h-6 text-xs"
                  title="Test Plaid Transfer (for development)"
                >
                  Test Transfer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenRecurringSetup}
                  className="h-6 text-xs"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  {existingContribution ? 'Edit' : 'Setup'}
                </Button>
              </div>
            </div>
            
            {existingContribution ? (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="font-medium">${existingContribution.amount.toFixed(2)}</span>
                  <span className="text-muted-foreground">
                    {existingContribution.frequency === 'weekly' && 'per week'}
                    {existingContribution.frequency === 'biweekly' && 'every 2 weeks'}
                    {existingContribution.frequency === 'monthly' && 'per month'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Next: {format(new Date(existingContribution.next_contribution_date), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: <span className="capitalize">{existingContribution.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No recurring contributions set up yet. Click "Setup" to get started.
              </div>
            )}
          </div>

          {/* Goal Status */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Transfers:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleDailyTransfers}
                className={`h-6 px-2 text-xs ${goal.daily_transfer_enabled ? 'text-green-600' : 'text-gray-500'}`}
              >
                {goal.daily_transfer_enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            {goal.target_date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>Target Date: {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Recurring Contribution Setup Dialog */}
      <Dialog open={showRecurringSetup} onOpenChange={setShowRecurringSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Recurring Contributions</DialogTitle>
            <DialogDescription>
              Set up automatic savings for your goal. Choose how much and how often you want to save.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount per contribution</label>
              <input
                type="number"
                placeholder="0.00"
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(e.target.value)}
                className="w-full h-10 px-3 border rounded-md"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select
                value={recurringFrequency}
                onChange={(e) => handleFrequencyChange(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                className="w-full h-10 px-3 border rounded-md"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {recurringFrequency === 'monthly' ? 'Day of month' : 'Day of week'}
              </label>
              {recurringFrequency === 'monthly' ? (
                <select
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(e.target.value)}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecurringSetup(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetupRecurringContribution}>
              {existingContribution ? 'Update' : 'Setup'} Recurring Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
