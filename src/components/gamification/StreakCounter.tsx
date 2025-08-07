
import React from 'react';
import { Flame } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const streakVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        active: "bg-orange-500 text-white",
        high: "bg-red-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StreakCounterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof streakVariants> {
  count: number;
  showIcon?: boolean;
  longestStreak?: number;
}

export const StreakCounter = React.forwardRef<HTMLDivElement, StreakCounterProps>(
  ({ className, variant, count, showIcon = true, longestStreak, ...props }, ref) => {
    // Determine variant based on streak count if not explicitly provided
    const computedVariant = variant || (
      count >= 10 ? "high" : 
      count >= 3 ? "active" : 
      "default"
    );
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(streakVariants({ variant: computedVariant }), className)}
            ref={ref}
            {...props}
          >
            {showIcon && (
              <Flame className="h-3 w-3 mr-1" />
            )}
            <span>{count}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">Current streak: {count} payments</p>
            {longestStreak !== undefined && (
              <p className="text-muted-foreground">Longest streak: {longestStreak} payments</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
);
StreakCounter.displayName = "StreakCounter";
