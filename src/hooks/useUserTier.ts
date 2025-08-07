
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserTier } from '@/types/gamification';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export const useUserTier = () => {
  const { user } = useAuth();
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserTier(null);
      setIsLoading(false);
      return;
    }

    const fetchUserTier = async () => {
      setIsLoading(true);
      
      try {
        // First try to get the user tier
        let { data, error } = await supabase
          .from('user_tiers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle case when no record exists
          
        if (error) {
          console.error('Error fetching user tier:', error);
          toast.error('Could not fetch your loyalty tier information');
          setIsLoading(false);
          return;
        }
        
        // If no tier record exists, use a default one without trying to insert
        // This avoids RLS policy violations
        if (!data) {
          console.log('No tier found for user, using default tier without inserting...');
          
          // Instead of inserting, just use a default tier object
          setUserTier({
            id: 'temp-id', // Temporary ID
            user_id: user.id,
            tier: 'Bronze',
            points: 0,
            current_streak: 0,
            longest_streak: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          toast.success('Welcome to the loyalty program! You start at Bronze tier.');
        } else {
          setUserTier(data as UserTier);
          
          // Track that tier was displayed
          trackEvent('tier_displayed', {
            tier: data.tier,
            points: data.points
          });
        }
      } catch (error) {
        console.error('Error fetching user tier:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTier();
    
    // Set up realtime subscription for tier updates
    const channel = supabase
      .channel('public:user_tiers')
      .on('postgres_changes', 
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_tiers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedTier = payload.new as UserTier;
          
          // If the tier has changed, show a toast notification
          if (userTier && userTier.tier !== updatedTier.tier) {
            toast.success(`Congratulations! You've been upgraded to ${updatedTier.tier} tier! 🎉`);
            trackEvent('tier_upgraded', {
              from_tier: userTier.tier,
              to_tier: updatedTier.tier,
              points: updatedTier.points
            });
          }
          
          setUserTier(updatedTier);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { userTier, isLoading };
};
