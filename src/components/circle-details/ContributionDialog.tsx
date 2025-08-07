import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { plaidService } from "@/lib/plaid";
import { PaymentNotificationService } from "@/lib/notifications";
import { useLinkedBankAccounts } from "@/hooks/useLinkedBankAccounts";
import { DollarSign, Calendar, Users, CreditCard, AlertCircle } from "lucide-react";

interface ContributionDialogProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  frequency: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContributionDialog({
  circleId,
  circleName,
  contributionAmount,
  frequency,
  isOpen,
  onOpenChange,
}: ContributionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { accounts, loading: accountsLoading } = useLinkedBankAccounts();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState(contributionAmount.toString());
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const handleContribution = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a contribution.",
        variant: "destructive",
      });
      return;
    }

    const amount = useCustomAmount ? parseFloat(customAmount) : contributionAmount;
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAccountId) {
      toast({
        title: "Bank Account Required",
        description: "Please select a bank account for this contribution.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Show pending notification
    PaymentNotificationService.showPendingNotification('contribution', amount, circleName);

    try {
      // Find the selected account to get the access token
      const selectedAccount = accounts.find(account => account.account_id === selectedAccountId);
      if (!selectedAccount) {
        throw new Error("Selected bank account not found");
      }

      // Process the payment through Plaid
      const paymentResult = await plaidService.processCirclePayment({
        user_id: user.id,
        circle_id: circleId,
        amount: amount,
        account_id: selectedAccountId,
        access_token: selectedAccount.plaid_access_token,
        description: `Contribution to ${circleName}`,
      });

      if (paymentResult.success) {
        // Track the contribution event
        trackEvent('circle_contribution_made', {
          circle_id: circleId,
          circle_name: circleName,
          amount: amount,
          frequency: frequency,
          transaction_id: paymentResult.transaction_id,
        });

        // Show success notification
        PaymentNotificationService.showPaymentNotification({
          type: 'contribution',
          success: true,
          amount: amount,
          circleName: circleName,
          transactionId: paymentResult.transaction_id,
          plaidTransferId: paymentResult.plaid_transfer_id,
        });

        // Close the dialog
        onOpenChange(false);
        
        // Reset form
        setCustomAmount(contributionAmount.toString());
        setUseCustomAmount(false);
        setSelectedAccountId("");
      } else {
        throw new Error(paymentResult.message || paymentResult.error || "Payment processing failed");
      }

    } catch (error) {
      console.error("Error making contribution:", error);
      
      // Show error notification
      PaymentNotificationService.showPaymentNotification({
        type: 'contribution',
        success: false,
        amount: amount,
        circleName: circleName,
        transactionId: '',
        error: error instanceof Error ? error.message : "There was an error processing your contribution. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    
    // Auto-switch to custom amount if user types something different
    if (value !== contributionAmount.toString()) {
      setUseCustomAmount(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Make Contribution
          </DialogTitle>
          <DialogDescription>
            Contribute to your savings circle "{circleName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Circle Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Circle:</span>
              <span className="text-sm">{circleName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frequency:</span>
              <span className="text-sm capitalize">{frequency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Standard Amount:</span>
              <span className="text-sm font-semibold">{formatCurrency(contributionAmount)}</span>
            </div>
          </div>

          {/* Contribution Amount */}
          <div className="space-y-3">
            <Label htmlFor="contribution-amount">Contribution Amount</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="standard-amount"
                  name="amount-type"
                  checked={!useCustomAmount}
                  onChange={() => setUseCustomAmount(false)}
                  className="h-4 w-4"
                />
                <Label htmlFor="standard-amount" className="text-sm font-normal">
                  Standard amount ({formatCurrency(contributionAmount)})
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="custom-amount"
                  name="amount-type"
                  checked={useCustomAmount}
                  onChange={() => setUseCustomAmount(true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="custom-amount" className="text-sm font-normal">
                  Custom amount
                </Label>
              </div>
            </div>

            {useCustomAmount && (
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="contribution-amount"
                  type="number"
                  value={customAmount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  className="pl-6"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          {/* Bank Account Selection */}
          <div className="space-y-3">
            <Label htmlFor="bank-account">Select Bank Account</Label>
            
            {accountsLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-muted rounded-md"></div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No Bank Accounts Linked</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  You need to link a bank account to make contributions. Please link your bank account first.
                </p>
              </div>
            ) : (
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bank account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{account.institution_name} - {account.account_name}</span>
                        <span className="text-muted-foreground">****{account.mask}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Summary */}
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Contribution:</span>
              <span className="font-bold text-lg">
                {formatCurrency(useCustomAmount ? parseFloat(customAmount) || 0 : contributionAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContribution}
            disabled={isProcessing || accounts.length === 0}
            className="min-w-[120px]"
          >
            {isProcessing ? "Processing..." : "Contribute"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 