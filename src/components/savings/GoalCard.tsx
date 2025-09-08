
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useAutomatedTransfers } from '@/hooks/useAutomatedTransfers';
import { PiggyBank, Check, Calendar, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';

interface GoalCardProps {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  isActive: boolean;
  createdAt: string;
}

export default function GoalCard({ 
  id, 
  name, 
  targetAmount, 
  currentAmount, 
  isActive,
  createdAt 
}: GoalCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { updateGoal } = useSavingsGoals();
  const { transfers, getEstimatedCompletionDate } = useAutomatedTransfers(id);
  
  // Calculate p ercentage complete
  const percentComplete = (currentAmount / targetAmount) * 100;
  const formattedPercent = Math.min(100, Math.round(percentComplete));

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Get estimated completion date
  const estimatedDate = transfers ? getEstimatedCompletionDate(currentAmount, targetAmount, transfers) : null;
  
  // Handle pausing/resuming goal
  const handleToggleStatus = async () => {
    try {
      await updateGoal({
        id,
        is_active: !isActive
      });
    } catch (error) {
      console.error('Error toggling goal status:', error);
    }
  };

  return (
    <Card className={`overflow-hidden ${!isActive ? 'opacity-70' : ''}`}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
          {!isActive && (
            <div className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
              Paused
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{formatCurrency(currentAmount)}</span>
              <span>{formatCurrency(targetAmount)}</span>
            </div>
            <Progress value={formattedPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {formattedPercent}% complete
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {estimatedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs">
                  Est. completion: {format(estimatedDate, 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Check className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">
                Started: {format(new Date(createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleToggleStatus}
        >
          {isActive ? (
            <>
              <Pause className="mr-1 h-3 w-3" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-1 h-3 w-3" />
              Resume
            </>
          )}
        </Button>
        
        <Button variant="default" size="sm" asChild className="text-xs">
          <Link to={`/savings-goals/${id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
