
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DepositDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  handleAddDeposit: () => Promise<void>;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  isDepositing: boolean;
}

export function DepositDialog({ 
  isOpen, 
  setIsOpen, 
  handleAddDeposit,
  depositAmount,
  setDepositAmount,
  isDepositing
}: DepositDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Deposit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Deposit</DialogTitle>
          <DialogDescription>
            Enter the amount you want to add to your goal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="depositAmount">Deposit Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">$</span>
              <Input
                id="depositAmount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="pl-6"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddDeposit} disabled={isDepositing}>
            {isDepositing ? 'Processing...' : 'Add Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
