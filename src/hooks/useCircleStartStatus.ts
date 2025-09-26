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



        // Get circle details including min_members
        const { data: circleDetails, error: circleDetailsError } = await supabase
          .from('circles')
          .select('min_members')
          .eq('id', circleId)
          .single();

        if (circleDetailsError) {
          throw circleDetailsError;
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

        // Get members who have authorized ACH recurring contributions
        const { data: authorizedMembers, error: authorizedError } = await supabase
          .from('circle_ach_authorizations')
          .select('user_id')
          .eq('circle_id', circleId)
          .eq('status', 'authorized');

        if (authorizedError) {
          throw authorizedError;
        }
        // console.log("authorizedMembers", authorizedMembers);
        const contributedMembers = authorizedMembers?.length || 0;

        // Calculate contribution percentage
        const contributionPercentage = totalMembers > 0 ? (contributedMembers / totalMembers) * 100 : 0;

        // Circle can be started if:
        // 1. At least 80% of members have authorized ACH contributions
        // 2. Authorized members count is greater than min_members
        // 3. Circle status is not already 'active' or 'started' or 'completed'
        const requiredAuthorized = Math.ceil(totalMembers * 0.8);
        const minMembers = circleDetails?.min_members ?? 0;
        const canStart = contributedMembers >= requiredAuthorized && 
                         contributedMembers >= minMembers &&
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
