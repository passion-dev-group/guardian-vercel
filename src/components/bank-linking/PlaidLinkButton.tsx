import { Button } from "@/components/ui/button";
import { Banknote, Loader2 } from "lucide-react";
import { usePlaidLink } from "@/hooks/usePlaidLink";
import { trackEvent } from "@/lib/analytics";
import type { PlaidAccount } from "@/types/plaid";

interface PlaidLinkButtonProps {
  onSuccess?: (accounts: PlaidAccount[], institutionName: string) => void;
  onExit?: (error?: any) => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

const PlaidLinkButton = ({ 
  onSuccess, 
  onExit, 
  variant = "default",
  size = "default",
  className = "",
  children 
}: PlaidLinkButtonProps) => {
  const { ready, open, isLoading, error } = usePlaidLink({
    onSuccess,
    onExit,
  });

  const handleClick = () => {
    if (!ready) return;
    
    trackEvent('plaid_link_button_clicked');
    open();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Banknote className="mr-2 h-4 w-4" />
          {children || "Link Bank Account"}
        </>
      )}
    </Button>
  );
};

export default PlaidLinkButton; 