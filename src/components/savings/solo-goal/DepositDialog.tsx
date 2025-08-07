
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

interface DepositDialogProps {
  goalId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  addManualDeposit: (params: { goalId: string; amount: number }) => Promise<any>;
}

export function DepositDialog({ 
  goalId, 
  isOpen, 
  onOpenChange, 
  addManualDeposit 
}: DepositDialogProps) {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const { toast } = useToast();
  
  const handleManualDeposit = async () => {
    if (!depositAmount) return;
    
    const amount = parseFloat(depositAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid positive amount',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const updated = await addManualDeposit({
        goalId,
        amount
      });
      
      if (updated) {
        setDepositAmount('');
        onOpenChange(false);
        
        trackEvent('manual_deposit', {
          goal_id: goalId,
          amount
        });
      }
    } catch (error) {
      console.error('Error making deposit:', error);
      toast({
        title: 'Error',
        description: 'Could not process deposit',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CardHeader>
          <CardTitle>Make a Deposit</CardTitle>
          <CardDescription>
            Add funds directly to your savings goal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="deposit-amount" className="text-sm font-medium">
                Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="pl-8 pr-4 py-2 w-full border rounded-md"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleManualDeposit}>
            Deposit Funds
          </Button>
        </CardFooter>
      </DialogContent>
    </Dialog>
  );
}
