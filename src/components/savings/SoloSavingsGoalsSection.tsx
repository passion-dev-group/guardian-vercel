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
import { Target, Plus, PiggyBank } from 'lucide-react';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import SoloGoalForm from './SoloGoalForm';

export default function SoloSavingsGoalsSection() {
  const { goals: soloGoals, isLoading: isLoadingGoals } = useSoloSavingsGoals();
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);

  return (
    <>
      <section aria-labelledby="solo-savings-heading" className="bg-card rounded-lg shadow">
        <div className="p-6">
          <h2 id="solo-savings-heading" className="text-xl font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Solo Savings Goals
          </h2>
          
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
                  <Card key={goal.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        {goal.name}
                      </CardTitle>
                      <CardDescription>
                        Target: ${goal.target_amount.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
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
