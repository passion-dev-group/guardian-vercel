
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

const NextPayoutWidget = ({ payoutDate, amount, circleId }: NextPayoutWidgetProps) => {
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  }, [circleId, user]);
  
  const toggleReminder = async () => {
    if (!circleId || !user || !payoutDate) return;
    
    setIsLoading(true);
    
    try {
      // Calculate reminder date (3 days before payout date)
      const reminderDate = new Date(payoutDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      // Use upsert to handle both insert and update in one operation
      const { error } = await supabase
        .from('user_notifications')
        .upsert({ 
          user_id: user.id,
          circle_id: circleId,
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
      <div className="md:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Next Payout: {formatCurrency(amount)}</h2>
          <div className="flex items-center text-muted-foreground">
            <CalendarDays className="w-4 h-4 mr-1" />
            <span>{formatDateRelative(payoutDate)}</span>
          </div>
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
            <Link to={`/circles/${circleId}`}>View Circle</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NextPayoutWidget;
