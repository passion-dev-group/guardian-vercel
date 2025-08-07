import { useState, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { circleService } from "@/lib/circle";
import { useAuth } from "@/contexts/AuthContext";
import type { CircleUser } from "@/types/circle";

interface UseCircleLinkResult {
  isLoading: boolean;
  error: string | null;
  initiateKyc: () => Promise<void>;
}

interface UseCircleLinkOptions {
  onSuccess?: (user: CircleUser) => void;
  onError?: (error: any) => void;
}

export const useCircleLink = (options: UseCircleLinkOptions = {}): UseCircleLinkResult => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateKyc = useCallback(async () => {
    if (!user?.id) {
      setError("User must be authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create KYC session with Circle
      const kycSession = await circleService.createKycSession(user.id);
      
      // Open Circle's KYC widget in popup
      const popup = window.open(
        kycSession.redirectUrl,
        'circle-kyc',
        'width=600,height=800,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for completion
      const pollForCompletion = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(pollForCompletion);
            setIsLoading(false);
            
            // Check if KYC was completed
            const status = await circleService.checkKycStatus(user.id);
            
            if (status.kycStatus.status === 'approved') {
              const circleUser = await circleService.getUser(user.id);
              trackEvent('circle_kyc_completed', { 
                user_id: user.id,
                wallet_id: circleUser.wallets[0]?.id 
              });
              
              // Save to database
              await circleService.saveCircleAccount({
                user_id: user.id,
                circle_user_id: circleUser.id,
                circle_wallet_id: circleUser.wallets[0]?.id,
                wallet_verification_status: 'verified',
                wallet_type: 'circle',
                is_active: true,
              });
              
              trackEvent('circle_wallet_linked', { 
                user_id: user.id,
                wallet_id: circleUser.wallets[0]?.id 
              });
              
              toast.success('Successfully connected with Circle!');
              
              if (options.onSuccess) {
                options.onSuccess(circleUser);
              }
            } else if (status.kycStatus.status === 'denied') {
              throw new Error('KYC verification was denied. Please contact support.');
            } else {
              toast.info('KYC verification is still pending. You will be notified when complete.');
            }
          }
        } catch (err) {
          clearInterval(pollForCompletion);
          setIsLoading(false);
          console.error('Error checking KYC status:', err);
          setError(err instanceof Error ? err.message : 'Failed to check KYC status');
          
          if (options.onError) {
            options.onError(err);
          }
        }
      }, 2000);

      // Cleanup if still polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollForCompletion);
        if (!popup.closed) {
          popup.close();
        }
        setIsLoading(false);
      }, 600000);

    } catch (err) {
      console.error('Error initiating Circle KYC:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect with Circle');
      toast.error('Failed to connect with Circle. Please try again.');
      
      if (options.onError) {
        options.onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, options]);

  return {
    isLoading,
    error,
    initiateKyc,
  };
};