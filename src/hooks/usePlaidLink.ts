
import { useState, useEffect, useCallback } from "react";
import { usePlaidLink as usePlaidLinkSDK } from "react-plaid-link";
import { trackEvent } from "@/lib/analytics";
import { plaidService } from "@/lib/plaid";
import { PaymentNotificationService } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import type { PlaidAccount } from "@/types/plaid";

interface UsePlaidLinkResult {
  ready: boolean;
  linkToken: string | null;
  open: () => void;
  isLoading: boolean;
  error: string | null;
}

interface UsePlaidLinkOptions {
  onSuccess?: (accounts: PlaidAccount[], institutionName: string) => void;
  onExit?: (error?: any) => void;
}

export const usePlaidLink = (options: UsePlaidLinkOptions = {}): UsePlaidLinkResult => {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create link token when component mounts
  useEffect(() => {
    if (!user?.id) return;

    const createLinkToken = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Use mock implementation for development
        // const isDevelopment = import.meta.env.DEV;        
        // const response = isDevelopment 
        //   ? await plaidService.mockCreateLinkToken(user.id)
        //   : await plaidService.createLinkToken(user.id);

        
        const response = await plaidService.createLinkToken(user.id);
        setLinkToken(response.link_token);
        trackEvent('plaid_link_token_created', { user_id: user.id });
      } catch (err) {
        console.error('Error creating link token:', err);
        setError(err instanceof Error ? err.message : 'Failed to create link token');
        PaymentNotificationService.showBankLinkingNotification(false, undefined, 'Failed to connect to bank. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    createLinkToken();
  }, [user?.id]);

  // Handle Plaid Link success
  const handleSuccess = useCallback(async (publicToken: string, metadata: any) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      trackEvent('plaid_link_success', { 
        institution: metadata.institution.name,
        accounts_count: metadata.accounts.length 
      });

      // Exchange public token for access token
      const tokenResponse = await plaidService.exchangePublicToken(publicToken);

      // Get account details
      const accounts = await plaidService.getAccounts(tokenResponse.access_token);
      console.log('accounts', accounts);
      // Save each account to database
      const savedAccounts = [];
      for (const account of accounts) {
        const savedAccount = await plaidService.saveLinkedAccount({
          user_id: user.id,
          plaid_item_id: tokenResponse.item_id,
          plaid_access_token: tokenResponse.access_token,
          institution_name: metadata.institution.name,
          account_id: account.account_id,
          account_name: account.name,
          account_type: account.type,
          account_subtype: account.subtype,
          mask: account.mask,
          verification_status: account.verification_status,
          is_active: true,
        });
        savedAccounts.push(savedAccount);
      }

      PaymentNotificationService.showBankLinkingNotification(true, metadata.institution.name);
      
      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(accounts, metadata.institution.name);
      }

    } catch (err) {
      console.error('Error processing Plaid success:', err);
      setError(err instanceof Error ? err.message : 'Failed to process bank connection');
      PaymentNotificationService.showBankLinkingNotification(false, undefined, 'Failed to save bank account. Please try again.');
      
      if (options.onExit) {
        options.onExit(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, options]);

  // Handle Plaid Link exit
  const handleExit = useCallback((err: any, metadata: any) => {
    if (err) {
      console.error('Plaid Link error:', err);
      setError(err.error?.display_message || err.error?.error_message || 'Connection failed');
      trackEvent('plaid_link_error', { 
        error_type: err.error?.error_type,
        error_code: err.error?.error_code,
        institution: metadata?.institution?.name 
      });
      PaymentNotificationService.showBankLinkingNotification(false, undefined, err.error?.display_message || 'Failed to connect to bank');
    } else {
      trackEvent('plaid_link_exited', { 
        institution: metadata?.institution?.name 
      });
    }

    if (options.onExit) {
      options.onExit(err);
    }
  }, [options]);

  // Configure Plaid Link
  const config = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  };

  const { open, ready } = usePlaidLinkSDK(config);

  return {
    ready: ready && !isLoading && !error,
    linkToken,
    open: open as () => void,
    isLoading,
    error,
  };
};
