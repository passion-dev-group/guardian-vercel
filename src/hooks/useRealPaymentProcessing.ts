import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";

interface PaymentProcessParams {
  circleId: string;
  userId: string;
  amount: number;
  accountId: string;
  accessToken: string;
}

interface TransferStatusParams {
  circleId: string;
  transferId: string;
}

interface PaymentResult {
  message: string;
  transfer_id: string;
  status: string;
  amount: number;
  estimated_completion?: string;
  authorization_id?: string;
  circle_name?: string;
}

interface TransferStatus {
  transfer_id: string;
  status: string;
  amount: string;
  created: string;
  last_updated: string;
  ach_class: string;
  network: string;
}

export const useRealPaymentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<PaymentResult | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const { toast } = useToast();

  const processPayment = async (action: "process_contribution" | "process_payout", params: PaymentProcessParams): Promise<PaymentResult | null> => {
    setIsProcessing(true);
    setProcessingResults(null);

    try {
      // Call the real payment processing edge function
      const { data, error } = await supabase.functions.invoke("process-payments", {
        body: {
          circleId: params.circleId,
          action,
          userId: params.userId,
          amount: params.amount,
          accountId: params.accountId,
          accessToken: params.accessToken
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Payment processing failed");
      }

      const result = data.data as PaymentResult;
      setProcessingResults(result);

      // Track analytics
      trackEvent('real_payment_processed', {
        circle_id: params.circleId,
        action: action,
        amount: params.amount,
        success: true,
        transfer_id: result.transfer_id,
        estimated_completion: result.estimated_completion
      });

      // Show success toast
      toast({
        title: "Payment Initiated",
        description: `${result.message}. Transfer ID: ${result.transfer_id}`,
        variant: "default"
      });

      return result;

    } catch (error) {
      console.error("Error processing payment:", error);
      
      // Track error analytics
      trackEvent('real_payment_processed', {
        circle_id: params.circleId,
        action: action,
        amount: params.amount,
        success: false,
        error: error.message
      });

      // Show error toast
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const processContribution = async (params: PaymentProcessParams) => {
    return await processPayment("process_contribution", params);
  };

  const processPayout = async (params: PaymentProcessParams) => {
    return await processPayment("process_payout", params);
  };

  const checkTransferStatus = async (params: TransferStatusParams): Promise<TransferStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("process-payments", {
        body: {
          circleId: params.circleId,
          action: "check_status",
          transferId: params.transferId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to check transfer status");
      }

      const status = data.data as TransferStatus;
      setTransferStatus(status);

      // Track status check
      trackEvent('transfer_status_checked', {
        circle_id: params.circleId,
        transfer_id: params.transferId,
        status: status.status,
        success: true
      });

      return status;

    } catch (error) {
      console.error("Error checking transfer status:", error);
      
      trackEvent('transfer_status_checked', {
        circle_id: params.circleId,
        transfer_id: params.transferId,
        success: false,
        error: error.message
      });

      toast({
        title: "Status Check Failed",
        description: error.message || "Failed to check transfer status",
        variant: "destructive"
      });

      return null;
    }
  };

  const getTransferStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "posted": return "bg-green-100 text-green-800 border-green-200";
      case "failed": return "bg-red-100 text-red-800 border-red-200";
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
      case "returned": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTransferStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Processing";
      case "posted": return "Completed";
      case "failed": return "Failed";
      case "cancelled": return "Cancelled";
      case "returned": return "Returned";
      default: return "Unknown";
    }
  };

  const getTransferStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "posted": return "✅";
      case "failed": return "❌";
      case "cancelled": return "🚫";
      case "returned": return "↩️";
      default: return "❓";
    }
  };

  const formatTransferAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  const getEstimatedCompletion = (action: "process_contribution" | "process_payout") => {
    return action === "process_contribution" ? "2-3 business days" : "1-2 business days";
  };

  return {
    isProcessing,
    processingResults,
    transferStatus,
    processContribution,
    processPayout,
    checkTransferStatus,
    getTransferStatusColor,
    getTransferStatusText,
    getTransferStatusIcon,
    formatTransferAmount,
    getEstimatedCompletion
  };
};
