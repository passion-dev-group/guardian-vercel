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
  hasProcessingContribution: boolean;
  circleStatus: string | null;
  canCancelRecurring: boolean;
  blockingReason: string | null;
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
    hasProcessingContribution: false,
    circleStatus: null,
    canCancelRecurring: false,
    blockingReason: null,
  });

  useEffect(() => {
    if (!circleId || !user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const checkContributionLimit = async () => {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get circle details including status
        const { data: circle, error: circleError } = await supabase
          .from('circles')
          .select('frequency, created_at, status')
          .eq('id', circleId)
          .single();

        if (circleError) {
          throw circleError;
        }

        // Get user's one-time contribution history for this circle
        const { data: oneTimeContributions, error: oneTimeContributionsError } = await supabase
          .from('circle_transactions')
          .select('transaction_date, status, amount')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .eq('type', 'contribution')
          .in('status', ['completed', 'processing']) // Include processing contributions
          .order('transaction_date', { ascending: false });

        if (oneTimeContributionsError) {
          throw oneTimeContributionsError;
        }

        // Get user's recurring contributions for this circle
        const { data: recurringContributions, error: recurringContributionsError } = await supabase
          .from('recurring_contributions')
          .select('created_at, is_active, amount, next_contribution_date')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (recurringContributionsError) {
          throw recurringContributionsError;
        }

        // Combine both types of contributions for analysis
        const contributions = oneTimeContributions || [];
        const activeRecurringContributions = recurringContributions || [];

        const now = new Date();
        const lastContribution = contributions?.[0];
        
        // Check for processing one-time contributions
        const processingOneTimeContributions = contributions?.filter(c => c.status === 'processing') || [];
        
        // Check for active recurring contributions (these are "processing" in a sense)
        const hasActiveRecurringContribution = activeRecurringContributions.length > 0;
        
        // User has a processing contribution if they have either:
        // 1. A one-time contribution that's processing, OR
        // 2. An active recurring contribution
        const hasProcessingContribution = processingOneTimeContributions.length > 0 || hasActiveRecurringContribution;
        
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
        
        // Business rules for contribution and cancellation
        const canCancelRecurring = () => {
          const circleStatus = circle.status;
          
          // Allow cancellation if:
          // 1. Circle hasn't started yet (pending)
          // 2. Circle cycle has completed
          // 3. Circle was cancelled
          if (circleStatus === 'pending' || circleStatus === 'completed' || circleStatus === 'cancelled') {
            return { canCancel: true, reason: null };
          }

          // Don't allow cancellation if circle is active/started (cycle is running)
          if (circleStatus === 'active' || circleStatus === 'started') {
            return { 
              canCancel: false, 
              reason: 'Cannot cancel recurring contribution while the circle cycle is active. Please wait until the current cycle completes.' 
            };
          }

          // Default to not allowing cancellation for unknown statuses
          return { 
            canCancel: false, 
            reason: 'Cannot cancel recurring contribution at this time. Please contact support if you need assistance.' 
          };
        };

        const recurringCancelStatus = canCancelRecurring();
        
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

        // Count one-time contributions in current cycle
        const oneTimeContributionsThisCycle = contributions?.filter(contrib => {
          const contribDate = new Date(contrib.transaction_date);
          return contribDate >= cycleStartDate && contribDate < cycleEndDate;
        }).length || 0;

        // If user has active recurring contribution, they're considered as having contributed
        const hasContributedThisCycle = oneTimeContributionsThisCycle > 0 || hasActiveRecurringContribution;

        // Determine if user can contribute
        let canContribute = !hasContributedThisCycle; // Only allow one contribution per cycle (either one-time OR recurring)
        let blockingReason: string | null = null;
        
        // Block contribution if there's a processing contribution
        if (hasProcessingContribution) {
          canContribute = false;
          if (hasActiveRecurringContribution) {
            blockingReason = 'You have an active recurring contribution set up. Please cancel it first if you want to make a one-time contribution.';
          } else {
            blockingReason = 'You have a contribution currently being processed. Please wait for it to complete before making another contribution.';
          }
        } else if (hasContributedThisCycle) {
          if (hasActiveRecurringContribution) {
            blockingReason = 'You have an active recurring contribution. You cannot make additional one-time contributions.';
          } else {
            blockingReason = 'You have already contributed for this cycle. Next contribution will be available in the next cycle.';
          }
        }
        
        // Calculate next allowed date
        let nextAllowedDate: Date | null = null;
        let daysUntilNextContribution = 0;

        if (!canContribute && lastContribution && !hasProcessingContribution) {
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
          contributionsThisCycle: hasContributedThisCycle ? 1 : 0, // 1 if contributed (either type), 0 if not
          cycleStartDate: cycleStartDate.toISOString(),
          cycleEndDate: cycleEndDate.toISOString(),
          hasProcessingContribution,
          circleStatus: circle.status,
          canCancelRecurring: recurringCancelStatus.canCancel,
          blockingReason,
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

    // Listen for recurring contribution cancellation events
    const handleRecurringCancelled = (event: CustomEvent) => {
      if (event.detail.targetId === circleId && event.detail.type === 'circle') {
        console.log('Refreshing contribution limit after recurring contribution cancelled');
        checkContributionLimit();
      }
    };

    // Listen for contribution completion events
    const handleContributionCompleted = (event: CustomEvent) => {
      if (event.detail.circleId === circleId && event.detail.type === 'circle') {
        console.log('Refreshing contribution limit after contribution completed');
        checkContributionLimit();
      }
    };

    window.addEventListener('recurring-contribution-cancelled', handleRecurringCancelled as EventListener);
    window.addEventListener('contribution-completed', handleContributionCompleted as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('recurring-contribution-cancelled', handleRecurringCancelled as EventListener);
      window.removeEventListener('contribution-completed', handleContributionCompleted as EventListener);
    };
  }, [circleId, user]);

  const refreshStatus = async () => {
    if (!circleId || !user) return;
    // The useEffect will handle the refresh
  };

  return { ...status, refreshStatus };
};
