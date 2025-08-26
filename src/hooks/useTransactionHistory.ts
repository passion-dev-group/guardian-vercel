import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TransactionWithDetails, 
  TransactionFilters, 
  TransactionHistoryResponse,
  TransactionStats 
} from '@/types/transactions';

export function useTransactionHistory(filters: TransactionFilters = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<TransactionStats>({
    totalContributions: 0,
    totalPayouts: 0,
    pendingAmount: 0,
    completedAmount: 0,
    failedAmount: 0,
    transactionCount: 0,
  });

  const fetchTransactions = useCallback(async (reset = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Build the base query
      let query = supabase
        .from('circle_transactions')
        .select(`
          *,
          circle:circles(id, name, contribution_amount, frequency),
          user:profiles!circle_transactions_user_id_fkey(id, display_name, avatar_url),
          recipient:profiles!circle_transactions_recipient_id_fkey(id, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.circleId) {
        query = query.eq('circle_id', filters.circleId);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('transaction_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('transaction_date', filters.dateTo);
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = reset ? 0 : (filters.offset || 0);
      query = query.range(offset, offset + limit - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data
      const transformedTransactions: TransactionWithDetails[] = (data || []).map(tx => ({
        id: tx.id,
        circle_id: tx.circle_id,
        user_id: tx.user_id,
        amount: tx.amount,
        type: tx.type as 'contribution' | 'payout',
        status: tx.status as 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
        transaction_date: tx.transaction_date,
        created_at: tx.created_at,
        description: tx.description,
        plaid_transfer_id: tx.plaid_transfer_id,
        plaid_authorization_id: tx.plaid_authorization_id,
        circle: tx.circle,
        user: tx.user,
        recipient: tx.recipient,
      }));

      // Update state
      if (reset) {
        setTransactions(transformedTransactions);
      } else {
        setTransactions(prev => [...prev, ...transformedTransactions]);
      }

      setHasMore(transformedTransactions.length === limit);

    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Build stats query
      let statsQuery = supabase
        .from('circle_transactions')
        .select('amount, type, status');

      // Apply filters for stats
      if (filters.circleId) {
        statsQuery = statsQuery.eq('circle_id', filters.circleId);
      }
      if (filters.userId) {
        statsQuery = statsQuery.eq('user_id', filters.userId);
      }
      if (filters.type) {
        statsQuery = statsQuery.eq('type', filters.type);
      }
      if (filters.status) {
        statsQuery = statsQuery.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        statsQuery = statsQuery.gte('transaction_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        statsQuery = statsQuery.lte('transaction_date', filters.dateTo);
      }

      const { data: statsData, error: statsError } = await statsQuery;

      if (statsError) {
        throw statsError;
      }

      // Calculate stats
      const newStats: TransactionStats = {
        totalContributions: 0,
        totalPayouts: 0,
        pendingAmount: 0,
        completedAmount: 0,
        failedAmount: 0,
        transactionCount: statsData?.length || 0,
      };

      statsData?.forEach(tx => {
        if (tx.type === 'contribution') {
          newStats.totalContributions += tx.amount;
        } else if (tx.type === 'payout') {
          newStats.totalPayouts += tx.amount;
        }

        if (tx.status === 'pending') {
          newStats.pendingAmount += tx.amount;
        } else if (tx.status === 'completed') {
          newStats.completedAmount += tx.amount;
        } else if (tx.status === 'failed') {
          newStats.failedAmount += tx.amount;
        }
      });

      setStats(newStats);

    } catch (err) {
      console.error('Error fetching transaction stats:', err);
    }
  }, [user, filters]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const newOffset = (filters.offset || 0) + (filters.limit || 20);
      fetchTransactions({ ...filters, offset: newOffset });
    }
  }, [loading, hasMore, filters, fetchTransactions]);

  const refresh = useCallback(() => {
    fetchTransactions(true);
    fetchStats();
  }, [fetchTransactions, fetchStats]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    stats,
    loadMore,
    refresh,
  };
} 