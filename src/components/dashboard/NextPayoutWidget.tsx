
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

interface NextPayoutWidgetProps {
  payoutDate: Date | null;
  amount: number;
  circleId: string | null;
}

interface PayoutInfo {
  date: string | null;
  amount: number;
  circleId: string | null;
  circleName: string | null;
  memberName: string | null;
  isYourTurn: boolean;
}

const NextPayoutWidget = ({ payoutDate, amount, circleId }: NextPayoutWidgetProps) => {
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchPayoutInfo = async () => {
      if (!user) return;
      
      try {
        // Get the next payout across all user's circles
        const { data: nextPayoutData, error } = await supabase
          .from('circle_members')
          .select(`
            next_payout_date,
            payout_position,
            circle_id,
            circles!inner(
              id,
              name,
              contribution_amount
            ),
            profiles!inner(display_name)
          `)
          .eq('user_id', user.id)
          .eq('payout_position', 1)
          .not('next_payout_date', 'is', null)
          .order('next_payout_date', { ascending: true })
          .limit(1);
          
        if (error) throw error;
        
        if (nextPayoutData && nextPayoutData.length > 0) {
          const payout = nextPayoutData[0];
          setPayoutInfo({
            date: payout.next_payout_date,
            amount: payout.circles.contribution_amount * 3, // Approximate amount (3 members)
            circleId: payout.circle_id,
            circleName: payout.circles.name,
            memberName: payout.profiles.display_name,
            isYourTurn: true
          });
        } else {
          // Check if user has any circles but no scheduled payouts
          const { data: userCircles } = await supabase
            .from('circle_members')
            .select('circle_id, circles!inner(name)')
            .eq('user_id', user.id)
            .limit(1);
            
          if (userCircles && userCircles.length > 0) {
            setPayoutInfo({
              date: null,
              amount: 0,
              circleId: null,
              circleName: userCircles[0].circles.name,
              memberName: null,
              isYourTurn: false
            });
          }
        }
      } catch (error) {
        console.error("Error fetching payout info:", error);
      }
    };
    
    fetchPayoutInfo();
  }, [user]);
  
  useEffect(() => {
    // Check if user has already enabled reminders for this circle
    const checkReminderStatus = async () => {
      if (!payoutInfo?.circleId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('circle_id', payoutInfo.circleId)
          .eq('type', 'upcoming_payout')
          .maybeSingle();
          
        if (!error && data) {
          setIsReminderEnabled(data.enabled);
        } else {
          // No notification setting exists yet, default to false
          setIsReminderEnabled(false);
        }
      } catch (error) {
        console.log("Error checking reminder status:", error);
        // Default to false on error
        setIsReminderEnabled(false);
      }
    };
    
    checkReminderStatus();
  }, [payoutInfo?.circleId, user]);
  
  const toggleReminder = async () => {
    if (!payoutInfo?.circleId || !user || !payoutInfo.date) return;
    
    setIsLoading(true);
    
    try {
      // Calculate reminder date (3 days before payout date)
      const reminderDate = new Date(payoutInfo.date);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      // Use upsert to handle both insert and update in one operation
      const { error } = await supabase
        .from('user_notifications')
        .upsert({ 
          user_id: user.id,
          circle_id: payoutInfo.circleId,
          type: 'upcoming_payout',
          enabled: !isReminderEnabled,
          status: !isReminderEnabled ? 'pending' : 'cancelled',
          scheduled_for: reminderDate.toISOString(),
        }, {
          onConflict: 'user_id,circle_id,type'
        });
      
      if (error) throw error;
      
      setIsReminderEnabled(!isReminderEnabled);
      
      // Track analytics event
      trackEvent('reminder_' + (!isReminderEnabled ? 'scheduled' : 'cancelled'), {
        circle_id: payoutInfo.circleId,
        type: 'upcoming_payout',
        payout_date: payoutInfo.date,
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
  if (!payoutInfo || !payoutInfo.circleName) {
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
  
  // Has circles but no scheduled payouts
  if (!payoutInfo.date) {
    return (
      <Card className="p-6">
        <div className="md:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Circle: {payoutInfo.circleName}</h2>
            <p className="text-muted-foreground">Rotation not yet initialized</p>
          </div>
          <div className="flex w-full items-center justify-end space-x-4 mt-4 md:mt-0">
            <Button asChild>
              <Link to={`/circles/${payoutInfo.circleId || '#'}`}>View Circle</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6">
      <div className="md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">
            Next Payout: {formatCurrency(payoutInfo.amount)}
            {payoutInfo.isYourTurn && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                🎯 Your Turn!
              </span>
            )}
          </h2>
          <div className="flex items-center text-muted-foreground mb-2">
            <CalendarDays className="w-4 h-4 mr-1" />
            <span>{formatDateRelative(new Date(payoutInfo.date))}</span>
          </div>
          {payoutInfo.circleName && (
            <div className="text-sm text-muted-foreground">
              Circle: {payoutInfo.circleName}
            </div>
          )}
          {payoutInfo.memberName && (
            <div className="text-sm text-muted-foreground">
              Next: {payoutInfo.memberName}
            </div>
          )}
        </div>
        <div className="flex w-full items-center justify-end space-x-4 mt-4 md:mt-0">
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
            <Link to={`/circles/${payoutInfo.circleId || '#'}`}>View Circle</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NextPayoutWidget;
