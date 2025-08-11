import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";

interface PaymentReminderParams {
  circleId: string;
  memberId: string;
  reminderType?: "gentle" | "urgent" | "overdue";
}

export const usePaymentReminder = () => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendReminder = async ({ 
    circleId, 
    memberId, 
    reminderType = "gentle" 
  }: PaymentReminderParams) => {
    setIsSending(true);
    
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("send-payment-reminder", {
        body: {
          circleId,
          memberId,
          adminUserId: user.id,
          reminderType
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Reminder sent successfully",
          description: `Payment reminder sent to ${data.recipient_name || 'member'}`,
        });

        // Track the event
        trackEvent('payment_reminder_sent', {
          circle_id: circleId,
          member_id: memberId,
          reminder_type: reminderType,
          success: true
        });

        return { success: true, data };
      } else {
        throw new Error(data?.error || "Failed to send reminder");
      }

    } catch (error) {
      console.error("Error sending payment reminder:", error);
      
      toast({
        title: "Failed to send reminder",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });

      // Track the failed event
      trackEvent('payment_reminder_failed', {
        circle_id: circleId,
        member_id: memberId,
        reminder_type: reminderType,
        error: error instanceof Error ? error.message : "Unknown error"
      });

      return { success: false, error };
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendReminder,
    isSending
  };
};
