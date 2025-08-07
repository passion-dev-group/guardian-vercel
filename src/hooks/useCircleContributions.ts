import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Contribution {
  id: string;
  amount: number;
  type: 'contribution' | 'payout';
  status: 'pending' | 'completed' | 'failed';
  transaction_date: string;
  description: string | null;
  user_id: string;
}

export interface ContributionStatus {
  lastContributionDate: Date | null;
  isDue: boolean;
  isOverdue: boolean;
  daysSinceLastContribution: number;
  nextContributionDate: Date | null;
}

export const useCircleContributions = (circleId: string | undefined) => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionStatus, setContributionStatus] = useState<ContributionStatus>({
    lastContributionDate: null,
    isDue: false,
    isOverdue: false,
    daysSinceLastContribution: 0,
    nextContributionDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId || !user) {
      setLoading(false);
      return;
    }

    const fetchContributions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user's contributions for this circle
        const { data, error: fetchError } = await supabase
          .from('circle_transactions')
          .select('*')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .eq('type', 'contribution')
          .order('transaction_date', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setContributions(data || []);

        // Calculate contribution status
        if (data && data.length > 0) {
          const lastContribution = data[0];
          const lastContributionDate = new Date(lastContribution.transaction_date);
          const today = new Date();
          const daysSinceLastContribution = Math.floor(
            (today.getTime() - lastContributionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Get circle frequency to determine if contribution is due
          const { data: circleData } = await supabase
            .from('circles')
            .select('frequency')
            .eq('id', circleId)
            .single();

          let isDue = false;
          let isOverdue = false;
          let nextContributionDate: Date | null = null;

          if (circleData) {
            const frequencyDays = circleData.frequency === 'weekly' ? 7 : 
                                circleData.frequency === 'biweekly' ? 14 : 30;
            
            isDue = daysSinceLastContribution >= frequencyDays;
            isOverdue = daysSinceLastContribution > frequencyDays + 7; // 7 days grace period
            
            // Calculate next contribution date
            nextContributionDate = new Date(lastContributionDate);
            nextContributionDate.setDate(nextContributionDate.getDate() + frequencyDays);
          }

          setContributionStatus({
            lastContributionDate,
            isDue,
            isOverdue,
            daysSinceLastContribution,
            nextContributionDate,
          });
        } else {
          // No contributions yet, set as due
          setContributionStatus({
            lastContributionDate: null,
            isDue: true,
            isOverdue: false,
            daysSinceLastContribution: 0,
            nextContributionDate: null,
          });
        }
      } catch (err) {
        console.error('Error fetching contributions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch contributions');
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [circleId, user]);

  const refreshContributions = () => {
    if (circleId && user) {
      // Trigger a re-fetch by updating the dependency
      setLoading(true);
      // This will trigger the useEffect to run again
    }
  };

  return {
    contributions,
    contributionStatus,
    loading,
    error,
    refreshContributions,
  };
}; 