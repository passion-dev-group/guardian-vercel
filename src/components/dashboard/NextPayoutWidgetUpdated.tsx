
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { StreakCounter } from "@/components/gamification/StreakCounter";

interface NextPayoutWidgetProps {
  payoutDate: Date | null;
  amount: number;
  circleId: string | null;
}

const NextPayoutWidget = ({ payoutDate, amount, circleId }: NextPayoutWidgetProps) => {
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user has already enabled reminders for this circle
    const checkReminderStatus = async () => {
      if (!circleId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('circle_id', circleId)
          .eq('type', 'upcoming_payout')
          .single();
          
        if (!error && data) {
          setIsReminderEnabled(data.enabled);
        }
      } catch (error) {
        console.log("Error checking reminder status:", error);
      }
    };
    
    checkReminderStatus();
  }, [circleId, user]);

  // Fetch user streak information
  useEffect(() => {
    const fetchUserStreak = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_tiers')
          .select('current_streak, longest_streak')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user streak:", error);
          return;
        }
        
        if (data) {
          setCurrentStreak(data.current_streak);
          setLongestStreak(data.longest_streak);
          
          // Track that streak was displayed
          if (data.current_streak > 0) {
            trackEvent('streak_displayed', {
              current_streak: data.current_streak,
              longest_streak: data.longest_streak
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user streak:", error);
      }
    };
    
    fetchUserStreak();
    
    // Set up realtime subscription for streak updates
    if (user) {
      const streakChannel = supabase
        .channel('streak-updates')
        .on('postgres_changes', 
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_tiers',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const { current_streak, longest_streak } = payload.new;
            
            // If streak changed, update state and track event
            if (current_streak !== currentStreak) {
              setCurrentStreak(current_streak);
              trackEvent('streak_updated', { 
                current_streak, 
                longest_streak 
              });
              
              // Only show streak toast notification for significant increases
              if (current_streak > currentStreak && (
                current_streak === 3 || 
                current_streak === 5 || 
                current_streak === 10 ||
                current_streak % 5 === 0
              )) {
                toast({
                  title: `${current_streak} Payment Streak! 🔥`,
                  description: `You've made ${current_streak} on-time payments in a row.${current_streak === 5 ? ' Keep going for more badges!' : ''}`
                });
              }
            }
            
            setLongestStreak(longest_streak);
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(streakChannel);
      };
    }
  }, [user, currentStreak, toast]);
  
  const toggleReminder = async () => {
    if (!circleId || !user || !payoutDate) return;
    
    setIsLoading(true);
    
    try {
      // Calculate reminder date (3 days before payout date)
      const reminderDate = new Date(payoutDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      // Check if notification setting already exists
      const { data: existingSettings, error: lookupError } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('circle_id', circleId)
        .eq('type', 'upcoming_payout')
        .maybeSingle();
      
      if (lookupError) throw lookupError;
      
      if (existingSettings) {
        // Update existing setting
        const { error: updateError } = await supabase
          .from('user_notifications')
          .update({ 
            enabled: !isReminderEnabled,
            status: !isReminderEnabled ? 'pending' : 'cancelled',
            scheduled_for: reminderDate.toISOString(),
          })
          .eq('id', existingSettings.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new setting
        const { error: insertError } = await supabase
          .from('user_notifications')
          .insert({ 
            user_id: user.id,
            circle_id: circleId,
            type: 'upcoming_payout',
            enabled: true,
            status: 'pending',
            scheduled_for: reminderDate.toISOString(),
          });
          
        if (insertError) throw insertError;
      }
      
      setIsReminderEnabled(!isReminderEnabled);
      
      // Track analytics event
      trackEvent('reminder_' + (!isReminderEnabled ? 'scheduled' : 'cancelled'), {
        circle_id: circleId,
        type: 'upcoming_payout',
        payout_date: payoutDate.toISOString(),
      });
      
      toast({
        title: !isReminderEnabled ? "Reminder enabled" : "Reminder disabled",
        description: !isReminderEnabled 
          ? "You'll get a notification before your payout" 
          : "You won't get reminders for this payout"
      });
    } catch (error) {
      console.error("Error toggling reminder:", error);
      toast({
        title: "Error",
        description: "Failed to update reminder settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // No upcoming payouts
  if (!payoutDate || !circleId) {
    return (
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">No Upcoming Payouts</h2>
            <p className="text-muted-foreground">Join a circle to start saving with friends</p>
          </div>
          <Button className="mt-4 md:mt-0" asChild>
            <Link to="/create-circle">Create New Circle</Link>
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">Next Payout: {formatCurrency(amount)}</h2>
            {currentStreak > 0 && (
              <StreakCounter count={currentStreak} longestStreak={longestStreak} />
            )}
          </div>
          <div className="flex items-center text-muted-foreground mt-1">
            <CalendarDays className="w-4 h-4 mr-1" />
            <span>{formatDateRelative(payoutDate)}</span>
          </div>
          {currentStreak > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {currentStreak === 1 
                ? "First on-time payment! Keep it up to build your streak."
                : `${currentStreak} on-time payments in a row. ${
                    currentStreak >= 5 
                      ? "You're on fire! 🔥" 
                      : "Keep going to earn badges and points!"
                  }`
              }
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleReminder}
            disabled={isLoading}
            className={`flex items-center ${isReminderEnabled ? 'border-primary text-primary' : ''}`}
          >
            <Bell className={`w-4 h-4 mr-2 ${isReminderEnabled ? 'fill-primary' : ''}`} />
            {isReminderEnabled ? 'Reminder On' : 'Set Reminder'}
          </Button>
          <Button asChild>
            <Link to={`/circles/${circleId}`}>View Circle</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NextPayoutWidget;
