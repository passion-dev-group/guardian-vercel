import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { plaidService } from "@/lib/plaid";
import { PaymentNotificationService } from "@/lib/notifications";
import { useLinkedBankAccounts } from "@/hooks/useLinkedBankAccounts";
import { DollarSign, CreditCard, AlertCircle } from "lucide-react";

interface DepositDialogProps {
  goalId: string;
  goalName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DepositDialog({
  goalId,
  goalName,
  isOpen,
  onOpenChange,
  onSuccess,
}: DepositDialogProps) {
  const { user } = useAuth();
  const { accounts, loading: accountsLoading } = useLinkedBankAccounts();
  const [isProcessing, setIsProcessing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("25");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const MAX_DEPOSIT_AMOUNT = 10000; // $10,000 max deposit
  const MIN_DEPOSIT_AMOUNT = 1; // $1 min deposit

  const handleDeposit = async () => {
    if (!user) {
      toast.error("Please log in to make a deposit");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      toast.error(`Minimum deposit amount is ${formatCurrency(MIN_DEPOSIT_AMOUNT)}`);
      return;
    }

    if (amount > MAX_DEPOSIT_AMOUNT) {
      toast.error(`Maximum deposit amount is ${formatCurrency(MAX_DEPOSIT_AMOUNT)}`);
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select a bank account for this deposit");
      return;
    }

    setIsProcessing(true);

    // Show pending notification
    PaymentNotificationService.showPendingNotification('deposit', amount, goalName);

    try {
      // Find the selected account to get the access token
      const selectedAccount = accounts.find(account => account.account_id === selectedAccountId);
      if (!selectedAccount) {
        throw new Error("Selected bank account not found");
      }

      // Process the payment through Plaid
      const paymentResult = await plaidService.processSoloDeposit({
        user_id: user.id,
        goal_id: goalId,
        amount: amount,
        account_id: selectedAccountId,
        access_token: selectedAccount.plaid_access_token,
        description: `Deposit to ${goalName}`,
      });

      if (paymentResult.success) {
        // Track the deposit event
        trackEvent('solo_goal_deposit_made', {
          goal_id: goalId,
          goal_name: goalName,
          amount: amount,
          transaction_id: paymentResult.transaction_id,
        });

        // Show success notification
        PaymentNotificationService.showPaymentNotification({
          type: 'deposit',
          success: true,
          amount: amount,
          goalName: goalName,
          transactionId: paymentResult.transaction_id,
          plaidTransferId: paymentResult.plaid_transfer_id,
        });

        // Close the dialog
        onOpenChange(false);
        
        // Reset form
        setDepositAmount("25");
        setSelectedAccountId("");

        // Call success callback if provided
        onSuccess?.();
      } else {
        throw new Error(paymentResult.message || paymentResult.error || "Payment processing failed");
      }

    } catch (error) {
      console.error("Error making deposit:", error);
      
      // Show error notification
      PaymentNotificationService.showPaymentNotification({
        type: 'deposit',
        success: false,
        amount: amount,
        goalName: goalName,
        transactionId: '',
        error: error instanceof Error ? error.message : "There was an error processing your deposit. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Deposit
          </DialogTitle>
          <DialogDescription>
            Add funds to your savings goal "{goalName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Deposit Amount */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="deposit-amount">Deposit Amount</Label>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(MIN_DEPOSIT_AMOUNT)} - {formatCurrency(MAX_DEPOSIT_AMOUNT)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="deposit-amount"
                type="number"
                value={depositAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const amount = parseFloat(value);
                  
                  // Allow empty input for better UX
                  if (value === '') {
                    setDepositAmount('');
                    return;
                  }
                  
                  // Validate input
                  if (isNaN(amount)) {
                    return;
                  }
                  
                  // Limit to 2 decimal places
                  const formatted = parseFloat(amount.toFixed(2)).toString();
                  setDepositAmount(formatted);
                }}
                placeholder="Enter amount"
                className={`pl-6 ${
                  depositAmount && (
                    parseFloat(depositAmount) < MIN_DEPOSIT_AMOUNT || 
                    parseFloat(depositAmount) > MAX_DEPOSIT_AMOUNT
                  ) ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                min={MIN_DEPOSIT_AMOUNT}
                max={MAX_DEPOSIT_AMOUNT}
                step="0.01"
              />
            </div>
            {depositAmount && (
              parseFloat(depositAmount) < MIN_DEPOSIT_AMOUNT ? (
                <p className="text-sm text-red-500">Amount must be at least {formatCurrency(MIN_DEPOSIT_AMOUNT)}</p>
              ) : parseFloat(depositAmount) > MAX_DEPOSIT_AMOUNT ? (
                <p className="text-sm text-red-500">Amount cannot exceed {formatCurrency(MAX_DEPOSIT_AMOUNT)}</p>
              ) : null
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
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">No Bank Accounts Linked</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need to link a bank account to make deposits.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/link-bank';
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Link Bank Account
                </Button>
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
              <span className="font-medium">Total Deposit:</span>
              <span className="font-bold text-lg">
                {formatCurrency(parseFloat(depositAmount) || 0)}
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
            onClick={handleDeposit}
            disabled={
              isProcessing || 
              accounts.length === 0 || 
              !depositAmount ||
              parseFloat(depositAmount) < MIN_DEPOSIT_AMOUNT ||
              parseFloat(depositAmount) > MAX_DEPOSIT_AMOUNT
            }
            className="min-w-[120px]"
          >
            {isProcessing ? "Processing..." : "Add Deposit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
