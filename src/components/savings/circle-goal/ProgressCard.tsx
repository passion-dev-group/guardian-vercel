
import { RefreshCw } from 'lucide-react';
import { CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ProgressCardProps {
  currentAmount: number;
  targetAmount: number;
  allocation?: {
    suggested_amount: number;
    suggested_percentage: number;
  } | null;
  isActive: boolean;
  isRefreshing: boolean;
  refreshAllocation: () => void;
  formatCurrency: (amount: number) => string;
}

export function ProgressCard({ 
  currentAmount, 
  targetAmount, 
  allocation, 
  isActive,
  isRefreshing,
  refreshAllocation,
  formatCurrency
}: ProgressCardProps) {
  const formattedPercent = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          Goal Progress
        </CardTitle>
        <CardDescription>
          Track your progress toward your savings goal
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Today's allocation info */}
        {allocation && allocation.suggested_amount > 0 && (
          <div className="bg-primary/10 p-3 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Today's Savings</h3>
              <div className="flex items-center">
                <p className="text-lg font-bold">{formatCurrency(allocation.suggested_amount)}</p>
                <span className="text-sm ml-2">
                  ({allocation.suggested_percentage.toFixed(1)}% of balance)
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={refreshAllocation}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-1">
            <span>{formatCurrency(currentAmount)}</span>
            <span>{formatCurrency(targetAmount)}</span>
          </div>
          <Progress value={formattedPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-1 text-right">
            {formattedPercent}% complete
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-1">Remaining</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(targetAmount - currentAmount)}
            </p>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-1">Status</h3>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-500'}`}></div>
              <p className="text-sm font-medium">{isActive ? 'Active' : 'Paused'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
