import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvitationRecipient {
  email: string;
  name?: string;
}

interface SendInvitationResult {
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{
    success: boolean;
    recipient: string;
    error?: string;
  }>;
}

export const useSendInvitations = () => {
  const [isSending, setIsSending] = useState(false);

  const sendCircleInvitations = async (
    circleId: string,
    invitedBy: string,
    recipients: InvitationRecipient[]
  ): Promise<SendInvitationResult | null> => {
    if (!recipients || recipients.length === 0) {
      toast.error("No recipients provided");
      return null;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-circle-invitation', {
        body: {
          circleId,
          invitedBy,
          recipients
        }
      });

      if (error) {
        console.error("Error sending invitation emails:", error);
        toast.error("Failed to send invitation emails");
        return null;
      }

      const result = data as SendInvitationResult;
      
      // Show success/failure messages
      if (result.sent > 0) {
        toast.success(`${result.sent} invitation${result.sent > 1 ? 's' : ''} sent successfully`);
      }
      
      if (result.failed > 0) {
        toast.error(`${result.failed} invitation${result.failed > 1 ? 's' : ''} failed to send`);
      }

      return result;
    } catch (error) {
      console.error("Error calling send-circle-invitation function:", error);
      toast.error("Failed to send invitation emails");
      return null;
    } finally {
      setIsSending(false);
    }
  };

  const resendInvitation = async (
    circleId: string,
    invitedBy: string,
    recipientEmail: string,
    recipientName?: string
  ): Promise<boolean> => {
    setIsSending(true);

    try {
      const result = await sendCircleInvitations(circleId, invitedBy, [
        { email: recipientEmail, name: recipientName }
      ]);

      return result?.sent === 1;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendCircleInvitations,
    resendInvitation,
    isSending
  };
}; 