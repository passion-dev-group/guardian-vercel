
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge, UserBadge } from '@/types/gamification';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export const useUserBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBadges([]);
      setIsLoading(false);
      return;
    }

    const fetchUserBadges = async () => {
      setIsLoading(true);
      
      try {
        // Get user badges with badge details
        const { data, error } = await supabase
          .from('user_badges')
          .select(`
            id,
            user_id,
            badge_id,
            earned_at,
            badges (*)
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching user badges:', error);
          toast.error('Could not fetch your badges');
          return;
        }
        
        // Format the returned data to match our type
        const formattedBadges = data.map(item => ({
          ...item,
          badge: item.badges as unknown as Badge // Fixed type conversion with proper casting
        }));
        
        setBadges(formattedBadges);

        // Track that badges were displayed
        trackEvent('badges_displayed', {
          badge_count: formattedBadges.length
        });
        
      } catch (error) {
        console.error('Error fetching user badges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserBadges();
    
    // Set up realtime subscription for new badges
    const channel = supabase
      .channel('public:user_badges')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the complete badge information
          const { data, error } = await supabase
            .from('badges')
            .select('*')
            .eq('id', payload.new.badge_id)
            .single();
            
          if (error || !data) {
            console.error('Error fetching new badge details:', error);
            return;
          }
          
          const newBadge = {
            ...payload.new,
            badge: data
          } as UserBadge;
          
          // Add the new badge to the list
          setBadges(prev => [newBadge, ...prev]);
          
          // Show a notification and track the event
          toast.success(`Congratulations! You've earned the "${data.name}" badge! 🏆`);
          trackEvent('badge_earned', {
            badge_name: data.name,
            badge_id: data.id,
            points: data.points
          });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { badges, isLoading };
};
