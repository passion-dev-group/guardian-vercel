
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TermsAndConditions from './TermsAndConditions';

interface TermsAndConditionsDialogProps {
  trigger: React.ReactNode;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

const TermsAndConditionsDialog = ({
  trigger,
  onAccept,
  onDecline,
  showActions = true,
}: TermsAndConditionsDialogProps) => {
  const [open, setOpen] = React.useState(false);

  const handleAccept = () => {
    if (onAccept) onAccept();
    setOpen(false);
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please review our terms and conditions for participating in MiTurn savings circles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <TermsAndConditions />
        </div>
        
        {showActions && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button onClick={handleAccept}>
              I Accept
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditionsDialog;
