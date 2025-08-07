
import { Sparkles, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface GoalDetailsCardProps {
  goal: {
    allocation_type: string;
    allocation_value: number;
    target_date: string | null;
    created_at: string;
    current_amount: number;
    updated_at: string;
  };
  targetDate: Date | undefined;
  setTargetDate: (date: Date | undefined) => void;
  isDatePopoverOpen: boolean;
  setIsDatePopoverOpen: (isOpen: boolean) => void;
  handleUpdateTargetDate: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function GoalDetailsCard({ 
  goal, 
  targetDate, 
  setTargetDate,
  isDatePopoverOpen,
  setIsDatePopoverOpen,
  handleUpdateTargetDate,
  formatCurrency
}: GoalDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Goal Details
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Contribution Method</p>
          <p className="font-medium">
            {goal.allocation_type === 'percentage' 
              ? `${goal.allocation_value}% of transfers`
              : `${formatCurrency(goal.allocation_value)} per transfer`
            }
          </p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Target Date</p>
          <div className="flex items-center gap-2">
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={!goal.target_date ? "w-full justify-start text-left font-normal" : ""}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {goal.target_date 
                    ? format(new Date(goal.target_date), 'MMM d, yyyy')
                    : "Set target date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">Select Target Date</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a date to reach your savings goal
                  </p>
                </div>
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
                <div className="p-3 border-t">
                  <Button size="sm" onClick={handleUpdateTargetDate} className="w-full">
                    Save Target Date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Created On</p>
          <p className="font-medium">
            {format(new Date(goal.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        
        {goal.current_amount > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {format(new Date(goal.updated_at), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
