
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export interface PaymentNotificationData {
  type: 'contribution' | 'payout';
  success: boolean;
  amount: number;
  circleName: string;
  transactionId: string;
  error?: string;
  recipientName?: string;
  plaidTransferId?: string;
}

export class PaymentNotificationService {
  /**
   * Show a payment notification based on the result
   */
  static showPaymentNotification(data: PaymentNotificationData) {
    const { type, success, amount, circleName, transactionId, error, recipientName, plaidTransferId } = data;

    if (success) {
      this.showSuccessNotification(data);
    } else {
      this.showErrorNotification(data);
    }

    // Track the notification event
    trackEvent('payment_notification_shown', {
      type,
      success,
      amount,
      circle_name: circleName,
      transaction_id: transactionId,
      plaid_transfer_id: plaidTransferId,
    });
  }

  /**
   * Show success notification for payments
   */
  private static showSuccessNotification(data: PaymentNotificationData) {
    const { type, amount, circleName, recipientName } = data;

    if (type === 'contribution') {
      toast({
        title: "🎉 Contribution Successful!",
        description: `Your contribution of ${formatCurrency(amount)} to "${circleName}" has been processed successfully.`,
        duration: 5000,
      });
    } else if (type === 'payout') {
      toast({
        title: "💰 Payout Successful!",
        description: `Successfully processed payout of ${formatCurrency(amount)} to ${recipientName || 'member'} from "${circleName}".`,
        duration: 5000,
      });
    }
  }

  /**
   * Show error notification for failed payments
   */
  private static showErrorNotification(data: PaymentNotificationData) {
    const { type, amount, circleName, error } = data;

    const errorMessage = error || "An unexpected error occurred. Please try again.";

    if (type === 'contribution') {
      toast({
        title: "❌ Contribution Failed",
        description: `Failed to process your contribution of ${formatCurrency(amount)} to "${circleName}". ${errorMessage}`,
        variant: "destructive",
        duration: 8000,
      });
    } else if (type === 'payout') {
      toast({
        title: "❌ Payout Failed",
        description: `Failed to process payout of ${formatCurrency(amount)} from "${circleName}". ${errorMessage}`,
        variant: "destructive",
        duration: 8000,
      });
    }
  }

  /**
   * Show pending payment notification
   */
  static showPendingNotification(type: 'contribution' | 'payout', amount: number, circleName: string) {
    const title = type === 'contribution' ? 'Processing Contribution...' : 'Processing Payout...';
    const description = type === 'contribution' 
      ? `Processing your contribution of ${formatCurrency(amount)} to "${circleName}"...`
      : `Processing payout of ${formatCurrency(amount)} from "${circleName}"...`;

    toast({
      title,
      description,
      duration: 3000,
    });
  }

  /**
   * Show bank account linking notification
   */
  static showBankLinkingNotification(success: boolean, institutionName?: string, error?: string) {
    if (success) {
      toast({
        title: "🏦 Bank Account Linked!",
        description: `Successfully connected your ${institutionName || 'bank'} account.`,
        duration: 4000,
      });
    } else {
      toast({
        title: "❌ Bank Linking Failed",
        description: error || "Failed to link your bank account. Please try again.",
        variant: "destructive",
        duration: 6000,
      });
    }
  }

  /**
   * Show circle-related notifications
   */
  static showCircleNotification(type: 'joined' | 'created' | 'invited', circleName: string) {
    const notifications = {
      joined: {
        title: "🎉 Welcome to the Circle!",
        description: `You've successfully joined "${circleName}". Start contributing to grow your savings!`,
      },
      created: {
        title: "✨ Circle Created!",
        description: `Your savings circle "${circleName}" has been created successfully. Invite members to get started!`,
      },
      invited: {
        title: "📧 Invitation Sent!",
        description: `Invitation sent for "${circleName}". Members will receive an email to join.`,
      },
    };

    const notification = notifications[type];
    toast({
      title: notification.title,
      description: notification.description,
      duration: 5000,
    });
  }

  /**
   * Show general error notification
   */
  static showErrorNotification(title: string, message: string) {
    toast({
      title,
      description: message,
      variant: "destructive",
      duration: 6000,
    });
  }

  /**
   * Show general success notification
   */
  static showSuccessNotification(title: string, message: string) {
    toast({
      title,
      description: message,
      duration: 4000,
    });
  }
}
