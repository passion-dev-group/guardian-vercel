
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isActive: boolean;
  isUpdating: boolean;
  setIsDepositDialogOpen: (isOpen: boolean) => void;
  handleToggleStatus: () => Promise<void>;
}

export function ActionButtons({ 
  isActive, 
  isUpdating, 
  setIsDepositDialogOpen,
  handleToggleStatus
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2 pt-2">
      <Button onClick={() => setIsDepositDialogOpen(true)}>
        Add Deposit
      </Button>
      
      <Button variant="outline" onClick={handleToggleStatus} disabled={isUpdating}>
        {isActive ? 'Pause Goal' : 'Resume Goal'}
      </Button>
    </div>
  );
}
