
import { useState } from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

interface AllocationData {
  id: string;
  goal_id: string;
  date: string;
  suggested_amount: number;
  status: string;
}

interface DailyAllocationCardProps {
  allocation: AllocationData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  goalId: string;
  refreshAllocation: () => Promise<void>;
}

export function DailyAllocationCard({ 
  allocation, 
  isLoading, 
  isRefreshing, 
  goalId,
  refreshAllocation 
}: DailyAllocationCardProps) {
  const { toast } = useToast();

  const handleRefreshAllocation = async () => {
    try {
      await refreshAllocation();
      
      toast({
        title: 'Success',
        description: 'Today\'s savings amount has been calculated'
      });
      
      trackEvent('allocation_refreshed', {
        goal_id: goalId
      });
    } catch (error) {
      console.error('Error refreshing allocation:', error);
      toast({
        title: 'Error',
        description: 'Could not calculate today\'s savings amount',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Today's Savings</CardTitle>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefreshAllocation}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <CardDescription>
          Your automated daily transfer amount
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="small" />
          </div>
        ) : allocation ? (
          <div className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Today's Amount</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(allocation.date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="text-3xl font-bold text-primary">
                ${allocation.suggested_amount.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This amount will be automatically transferred to help you reach your goal
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              No allocation has been calculated for today yet.
            </p>
            <Button onClick={handleRefreshAllocation} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Calculate Today's Amount
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
