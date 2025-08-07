import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PayoutInfo {
  totalPool: number;
  availablePool: number;
  nextPayoutMember: {
    id: string;
    user_id: string;
    payout_position: number;
    next_payout_date: string | null;
    profile: {
      display_name: string | null;
      avatar_url: string | null;
    };
  } | null;
  payoutHistory: Array<{
    id: string;
    user_id: string;
    amount: number;
    status: string;
    transaction_date: string;
    profile: {
      display_name: string | null;
    };
  }>;
}

export const useCirclePayouts = (circleId: string | undefined) => {
  const { user } = useAuth();
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo>({
    totalPool: 0,
    availablePool: 0,
    nextPayoutMember: null,
    payoutHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId) {
      setLoading(false);
      return;
    }

    const fetchPayoutInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get all completed contributions to calculate total pool
        const { data: contributions, error: contributionsError } = await supabase
          .from('circle_transactions')
          .select('amount')
          .eq('circle_id', circleId)
          .eq('type', 'contribution')
          .eq('status', 'completed');

        if (contributionsError) {
          throw contributionsError;
        }

        const totalPool = contributions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

        // Get all completed payouts to calculate available pool
        const { data: payouts, error: payoutsError } = await supabase
          .from('circle_transactions')
          .select('amount')
          .eq('circle_id', circleId)
          .eq('type', 'payout')
          .eq('status', 'completed');

        if (payoutsError) {
          throw payoutsError;
        }

        const totalPaidOut = payouts?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        const availablePool = totalPool - totalPaidOut;

        // Get next payout member (lowest payout position)
        const { data: nextMember, error: memberError } = await supabase
          .from('circle_members')
          .select(`
            id,
            user_id,
            payout_position,
            next_payout_date
          `)
          .eq('circle_id', circleId)
          .not('payout_position', 'is', null)
          .order('payout_position', { ascending: true })
          .limit(1)
          .single();

        if (memberError && memberError.code !== 'PGRST116') {
          throw memberError;
        }

        // Get profile data separately if we have a next member
        let nextMemberWithProfile = null;
        if (nextMember) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', nextMember.user_id)
            .maybeSingle();

          nextMemberWithProfile = {
            ...nextMember,
            profile: profileData || { display_name: null, avatar_url: null }
          };
        }

        // Get payout history
        const { data: payoutHistory, error: historyError } = await supabase
          .from('circle_transactions')
          .select(`
            id,
            user_id,
            amount,
            status,
            transaction_date
          `)
          .eq('circle_id', circleId)
          .eq('type', 'payout')
          .order('transaction_date', { ascending: false })
          .limit(10);

        if (historyError) {
          throw historyError;
        }

        // Get profile data for payout history
        const payoutHistoryWithProfiles = await Promise.all(
          (payoutHistory || []).map(async (payout) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', payout.user_id)
              .maybeSingle();

            return {
              ...payout,
              profile: profileData || { display_name: null }
            };
          })
        );

        setPayoutInfo({
          totalPool,
          availablePool,
          nextPayoutMember: nextMemberWithProfile,
          payoutHistory: payoutHistoryWithProfiles,
        });

      } catch (err) {
        console.error('Error fetching payout info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch payout information');
      } finally {
        setLoading(false);
      }
    };

    fetchPayoutInfo();
  }, [circleId]);

  const refreshPayoutInfo = () => {
    if (circleId) {
      setLoading(true);
      // This will trigger the useEffect to run again
    }
  };

  return {
    payoutInfo,
    loading,
    error,
    refreshPayoutInfo,
  };
}; 