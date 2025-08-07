import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { useCircleLink } from "@/hooks/useCircleLink";
import { trackEvent } from "@/lib/analytics";
import type { CircleUser } from "@/types/circle";

interface CircleLinkButtonProps {
  onSuccess?: (user: CircleUser) => void;
  onError?: (error: any) => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

const CircleLinkButton = ({ 
  onSuccess, 
  onError, 
  variant = "default",
  size = "default",
  className = "",
  children 
}: CircleLinkButtonProps) => {
  const { isLoading, initiateKyc, error } = useCircleLink({
    onSuccess,
    onError,
  });

  const handleClick = async () => {
    trackEvent('circle_kyc_started');
    await initiateKyc();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to Circle...
        </>
      ) : (
        <>
          <Shield className="mr-2 h-4 w-4" />
          {children || "Connect with Circle"}
        </>
      )}
    </Button>
  );
};

export default CircleLinkButton;