
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SoloGoalForm from '../SoloGoalForm';

interface GoalHeaderProps {
  goal: {
    id: string;
    name: string;
    created_at: string;
  };
  setIsEditDialogOpen: (isOpen: boolean) => void;
  isEditDialogOpen: boolean;
  setIsDepositDialogOpen: (isOpen: boolean) => void;
}

export function GoalHeader({ 
  goal, 
  setIsEditDialogOpen, 
  isEditDialogOpen, 
  setIsDepositDialogOpen 
}: GoalHeaderProps) {
  const navigate = useNavigate();
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2" 
          onClick={handleGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{goal.name}</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-muted-foreground">
          Created on {format(new Date(goal.created_at), 'MMM d, yyyy')}
        </p>
        
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit Goal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <SoloGoalForm 
                goalId={goal.id} 
                onComplete={() => {
                  setIsEditDialogOpen(false);
                  window.location.reload();
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => setIsDepositDialogOpen(true)}>
            Add Deposit
          </Button>
        </div>
      </div>
    </div>
  );
}
