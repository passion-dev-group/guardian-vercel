import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ContributionLimitStatus {
  canContribute: boolean;
  lastContributionDate: string | null;
  nextAllowedDate: string | null;
  daysUntilNextContribution: number;
  isLoading: boolean;
  error: string | null;
  contributionsThisCycle: number;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
}

export const useContributionLimit = (circleId: string | undefined) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ContributionLimitStatus>({
    canContribute: false,
    lastContributionDate: null,
    nextAllowedDate: null,
    daysUntilNextContribution: 0,
    isLoading: true,
    error: null,
    contributionsThisCycle: 0,
    cycleStartDate: null,
    cycleEndDate: null,
  });

  useEffect(() => {
    if (!circleId || !user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const checkContributionLimit = async () => {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get circle details to understand the frequency
        const { data: circle, error: circleError } = await supabase
          .from('circles')
          .select('frequency, created_at')
          .eq('id', circleId)
          .single();

        if (circleError) {
          throw circleError;
        }

        // Get user's contribution history for this circle
        const { data: contributions, error: contributionsError } = await supabase
          .from('circle_transactions')
          .select('transaction_date, status, amount')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .eq('type', 'contribution')
          .in('status', ['completed', 'processing']) // Include processing contributions
          .order('transaction_date', { ascending: false });

        if (contributionsError) {
          throw contributionsError;
        }

        const now = new Date();
        const lastContribution = contributions?.[0];
        
        // Calculate cycle length in days
        const getCycleDays = (frequency: string): number => {
          switch (frequency) {
            case 'weekly': return 7;
            case 'biweekly': return 14;
            case 'monthly': return 30;
            case 'quarterly': return 90;
            case 'annual': return 365;
            default: return 30;
          }
        };

        const cycleDays = getCycleDays(circle.frequency);
        
        // Calculate current cycle start and end dates
        const calculateCycleStartDate = (lastContribDateStr: string | null, frequency: string): Date => {
          if (!lastContribDateStr) {
            // If no previous contribution, cycle starts from circle creation or a reasonable default
            const circleCreated = new Date(circle.created_at);
            const daysSinceCreation = Math.floor((now.getTime() - circleCreated.getTime()) / (1000 * 60 * 60 * 24));
            const cyclesSinceCreation = Math.floor(daysSinceCreation / cycleDays);
            
            const cycleStart = new Date(circleCreated);
            cycleStart.setDate(cycleStart.getDate() + (cyclesSinceCreation * cycleDays));
            return cycleStart;
          }

          // Calculate cycle based on last contribution
          const lastContribDate = new Date(lastContribDateStr);
          const daysSinceLastContrib = Math.floor((now.getTime() - lastContribDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastContrib < cycleDays) {
            // Still in the same cycle as last contribution
            return lastContribDate;
          } else {
            // Calculate which cycle we're currently in
            const cyclesSinceLastContrib = Math.floor(daysSinceLastContrib / cycleDays);
            const currentCycleStart = new Date(lastContribDate);
            currentCycleStart.setDate(currentCycleStart.getDate() + (cyclesSinceLastContrib * cycleDays));
            return currentCycleStart;
          }
        };

        const cycleStartDate = calculateCycleStartDate(lastContribution?.transaction_date || null, circle.frequency);
        const cycleEndDate = new Date(cycleStartDate);
        cycleEndDate.setDate(cycleEndDate.getDate() + cycleDays);

        // Count contributions in current cycle
        const contributionsThisCycle = contributions?.filter(contrib => {
          const contribDate = new Date(contrib.transaction_date);
          return contribDate >= cycleStartDate && contribDate < cycleEndDate;
        }).length || 0;

        // Determine if user can contribute
        const canContribute = contributionsThisCycle === 0; // Only allow one contribution per cycle
        
        // Calculate next allowed date
        let nextAllowedDate: Date | null = null;
        let daysUntilNextContribution = 0;

        if (!canContribute && lastContribution) {
          nextAllowedDate = new Date(cycleEndDate);
          daysUntilNextContribution = Math.max(0, Math.ceil((nextAllowedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        setStatus({
          canContribute,
          lastContributionDate: lastContribution?.transaction_date || null,
          nextAllowedDate: nextAllowedDate?.toISOString() || null,
          daysUntilNextContribution,
          isLoading: false,
          error: null,
          contributionsThisCycle,
          cycleStartDate: cycleStartDate.toISOString(),
          cycleEndDate: cycleEndDate.toISOString(),
        });

      } catch (error) {
        console.error('Error checking contribution limit:', error);
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to check contribution status',
        }));
      }
    };

    checkContributionLimit();

    // Set up real-time subscription for transaction changes
    const subscription = supabase
      .channel(`circle-${circleId}-contributions`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_transactions',
        filter: `circle_id=eq.${circleId}`,
      }, (payload: any) => {
        // Only refresh if it's a contribution transaction for this user
        if (payload.new?.type === 'contribution' && payload.new?.user_id === user.id) {
          checkContributionLimit();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [circleId, user]);

  const refreshStatus = async () => {
    if (!circleId || !user) return;
    // The useEffect will handle the refresh
  };

  return { ...status, refreshStatus };
};
