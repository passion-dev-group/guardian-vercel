import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CircleStartStatus {
  canStart: boolean;
  contributionPercentage: number;
  totalMembers: number;
  contributedMembers: number;
  isLoading: boolean;
  error: string | null;
  circleStatus: string | null;
}

export const useCircleStartStatus = (circleId: string | undefined) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CircleStartStatus>({
    canStart: false,
    contributionPercentage: 0,
    totalMembers: 0,
    contributedMembers: 0,
    isLoading: true,
    error: null,
    circleStatus: null,
  });

  useEffect(() => {
    if (!circleId || !user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const checkStartStatus = async () => {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get circle details including current status
        const { data: circle, error: circleError } = await supabase
          .from('circles')
          .select('status')
          .eq('id', circleId)
          .single();

        if (circleError) {
          throw circleError;
        }



        // Get total number of circle members
        const { data: members, error: membersError } = await supabase
          .from('circle_members')
          .select('user_id')
          .eq('circle_id', circleId);

        if (membersError) {
          throw membersError;
        }

        const totalMembers = members?.length || 0;

        // Get unique members who have made at least one completed contribution
        const { data: contributions, error: contributionsError } = await supabase
          .from('circle_transactions')
          .select('user_id')
          .eq('circle_id', circleId)
          .eq('type', 'contribution')
          .eq('status', 'completed');

        if (contributionsError) {
          throw contributionsError;
        }

        // Count unique members who have contributed
        const uniqueContributors = new Set(contributions?.map(c => c.user_id) || []);
        const contributedMembers = uniqueContributors.size;

        // Calculate contribution percentage
        const contributionPercentage = totalMembers > 0 ? (contributedMembers / totalMembers) * 100 : 0;

        // Circle can be started if:
        // 1. At least 80% of members have contributed
        // 2. Circle status is not already 'active' or 'started' or 'completed'
        const canStart = contributionPercentage >= 80 && 
                         circle.status !== 'active' && 
                         circle.status !== 'started' &&
                         circle.status !== 'completed';

        setStatus({
          canStart,
          contributionPercentage: Math.round(contributionPercentage),
          totalMembers,
          contributedMembers,
          isLoading: false,
          error: null,
          circleStatus: circle.status,
        });

      } catch (error) {
        console.error('Error checking circle start status:', error);
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to check circle status',
        }));
      }
    };

    checkStartStatus();

    // Set up real-time subscription for circle transactions
    const subscription = supabase
      .channel(`circle-${circleId}-contributions`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_transactions',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        // Refetch status when transactions change
        checkStartStatus();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_members',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        // Refetch status when members change
        checkStartStatus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [circleId, user]);

  const refreshStatus = async () => {
    if (!circleId || !user) return;
    
    setStatus(prev => ({ ...prev, isLoading: true }));
    // The useEffect will handle the refresh
  };

  return { ...status, refreshStatus };
};
