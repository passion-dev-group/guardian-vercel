
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GoalHeaderProps {
  goalName: string;
  navigateBack: () => void;
}

export function GoalHeader({ goalName, navigateBack }: GoalHeaderProps) {
  return (
    <div className="flex items-center mb-6">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mr-2" 
        onClick={navigateBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">{goalName}</h1>
    </div>
  );
}
