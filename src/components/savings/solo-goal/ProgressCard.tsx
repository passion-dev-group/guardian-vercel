
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PiggyBank, CreditCard, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface ProgressCardProps {
  currentAmount: number;
  targetAmount: number;
  targetDate: string | null;
}

export function ProgressCard({ currentAmount, targetAmount, targetDate }: ProgressCardProps) {
  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  
  // Calculate days remaining
  const daysRemaining = targetDate
    ? differenceInDays(new Date(targetDate), new Date())
    : null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Goal Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">
              ${currentAmount.toFixed(2)} of ${targetAmount.toFixed(2)}
            </span>
            <span className="text-sm font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-muted/50 rounded-lg">
            <PiggyBank className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm font-medium">Current Savings</p>
              <p className="text-xl font-bold">${currentAmount.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-muted/50 rounded-lg">
            <CreditCard className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm font-medium">Target Amount</p>
              <p className="text-xl font-bold">${targetAmount.toFixed(2)}</p>
            </div>
          </div>
          
          {targetDate && (
            <div className="flex items-center p-4 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mr-3 text-primary" />
              <div>
                <p className="text-sm font-medium">Target Date</p>
                <p className="text-xl font-bold">
                  {format(new Date(targetDate), 'MMM d, yyyy')}
                </p>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {daysRemaining} days remaining
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
