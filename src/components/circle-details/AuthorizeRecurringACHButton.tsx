import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthorizeRecurringACHDialog } from "./AuthorizeRecurringACHDialog";
import { FrequencyType } from "@/types/frequency";
import RevokeACHDialog from "./RevokeACHDialog";

interface AuthorizeRecurringACHButtonProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  frequency: FrequencyType;
  circleStatus?: string;
  isAdmin?: boolean;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  children?: React.ReactNode;
}

export function AuthorizeRecurringACHButton({
  circleId,
  circleName,
  contributionAmount,
  frequency,
  circleStatus = "pending",
  isAdmin = false,
  className = "w-full",
  variant = "default",
  size = "default",
  disabled = false,
  children,
}: AuthorizeRecurringACHButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthorizationStatus = async () => {
      if (!circleId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('circle_ach_authorizations')
          .select('id')
          .eq('circle_id', circleId)
          .eq('user_id', userId)
          .eq('status', 'authorized')
          .maybeSingle();

        setIsAuthorized(data && !error);
      } catch (err) {
        console.error('Error checking ACH authorization status:', err);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorizationStatus();
  }, [circleId]);

  const handleClick = () => {
    if (isAuthorized) {
      // If authorized and circle is pending, show revoke dialog (but not for admins)
      if (circleStatus === "pending" && !isAdmin) {
        setRevokeDialogOpen(true);
      }
    } else {
      // If not authorized, show authorization dialog
      setDialogOpen(true);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    // Refresh authorization status when dialog closes
    if (!open) {
      refreshAuthorizationStatus();
    }
  };

  const handleRevokeDialogClose = (open: boolean) => {
    setRevokeDialogOpen(open);
    // Refresh authorization status when dialog closes
    if (!open) {
      refreshAuthorizationStatus();
    }
  };

  const refreshAuthorizationStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) return;

      const { data, error } = await supabase
        .from('circle_ach_authorizations')
        .select('id')
        .eq('circle_id', circleId)
        .eq('user_id', userId)
        .eq('status', 'authorized')
        .maybeSingle();

      setIsAuthorized(data && !error);
    } catch (err) {
      console.error('Error refreshing ACH authorization status:', err);
    }
  };

  // Determine button text and icon based on authorization status and circle status
  const getButtonContent = () => {
    if (isAuthorized) {
      if (circleStatus === "pending" && !isAdmin) {
        return {
          icon: <X className="mr-2 h-4 w-4" />,
          text: "Decline ACH Authorization"
        };
      } else {
        return {
          icon: <DollarSign className="mr-2 h-4 w-4" />,
          text: "ACH Authorized"
        };
      }
    } else {
      return {
        icon: <DollarSign className="mr-2 h-4 w-4" />,
        text: "Authorize Recurring ACH"
      };
    }
  };

  const buttonContent = getButtonContent();
  const canRevoke = isAuthorized && circleStatus === "pending" && !isAdmin;
  
  // Hide the button if admin is authorized (they can't revoke)
  const shouldHideButton = isAuthorized && isAdmin;

  // Don't render the button if it should be hidden
  if (shouldHideButton) {
    return null;
  }

  return (
    <>
      <Button
        className={className}
        variant={canRevoke ? "destructive" : variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isLoading || (isAuthorized && circleStatus !== "pending")}
      >
        {buttonContent.icon}
        {children || buttonContent.text}
      </Button>

      <AuthorizeRecurringACHDialog
        circleId={circleId}
        circleName={circleName}
        contributionAmount={contributionAmount}
        frequency={frequency}
        isOpen={dialogOpen}
        onOpenChange={handleDialogClose}
      />

      <RevokeACHDialog
        circleId={circleId}
        circleName={circleName}
        isOpen={revokeDialogOpen}
        onOpenChange={handleRevokeDialogClose}
      />
    </>
  );
}

export default AuthorizeRecurringACHButton;
