import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { plaidService } from "@/lib/plaid";
import { LinkedBankAccount } from "@/types/plaid";

export const useLinkedBankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAccounts = async () => {
      setLoading(true);
      setError(null);

      try {
        const linkedAccounts = await plaidService.getLinkedAccounts(user.id);
        setAccounts(linkedAccounts);
      } catch (err) {
        console.error('Error fetching linked accounts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bank accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  const refreshAccounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const linkedAccounts = await plaidService.getLinkedAccounts(user.id);
      setAccounts(linkedAccounts);
    } catch (err) {
      console.error('Error refreshing linked accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const removeAccount = async (accountId: string) => {
    try {
      await plaidService.removeLinkedAccount(accountId);
      setAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (err) {
      console.error('Error removing linked account:', err);
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    refreshAccounts,
    removeAccount,
  };
}; 