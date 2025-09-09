import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  DollarSign, 
  ArrowRight, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Banknote,
  TrendingUp
} from "lucide-react";
import { useRealPaymentProcessing } from "@/hooks/useRealPaymentProcessing";
import { useContributionLimit } from "@/hooks/useContributionLimit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface RealPaymentProcessorProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  isAdmin: boolean;
}

interface LinkedAccount {
  id: string;
  account_id: string;
  plaid_access_token: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  mask: string;
}

const RealPaymentProcessor = ({ 
  circleId, 
  circleName, 
  contributionAmount, 
  isAdmin 
}: RealPaymentProcessorProps) => {
  const { user } = useAuth();
  const contributionStatus = useContributionLimit(circleId);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<number>(contributionAmount);
  const [paymentType, setPaymentType] = useState<"contribution" | "payout">("contribution");
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const {
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
  } = useRealPaymentProcessing();

  useEffect(() => {
    fetchLinkedAccounts();
  }, [user]);

  const fetchLinkedAccounts = async () => {
    try {
      setAccountsLoading(true);
      
      // Get user's linked bank accounts from Plaid
      const { data: accounts, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      setLinkedAccounts(accounts || []);
      
      // Auto-select first account if available
      if (accounts && accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].id);
      }

    } catch (error) {
      console.error("Error fetching linked accounts:", error);
    } finally {
      setAccountsLoading(false);
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedAccount || !user) return;

    const account = linkedAccounts.find(acc => acc.id === selectedAccount);
    if (!account) return;

    const params = {
      circleId,
      userId: user.id,
      amount: customAmount,
      accountId: account.account_id,
      accessToken: account.plaid_access_token
    };

    try {
      if (paymentType === "contribution") {
        const result = await processContribution(params);
        
        // If contribution was successful, trigger a refresh of contribution status
        if (result) {
          window.dispatchEvent(new CustomEvent('contribution-completed', {
            detail: { circleId, type: 'circle' }
          }));
        }
      } else {
        await processPayout(params);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
    }
  };

  const handleStatusCheck = async () => {
    if (!processingResults?.transfer_id) return;

    await checkTransferStatus({
      circleId,
      transferId: processingResults.transfer_id
    });
  };

  const selectedAccountData = linkedAccounts.find(acc => acc.id === selectedAccount);
  const canProcessPayment = selectedAccount && customAmount > 0 && !isProcessing && 
    (paymentType === "payout" || contributionStatus.canContribute);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (linkedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Real Payment Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No linked bank accounts found</p>
              <p className="text-xs">Link your bank account to start making real payments</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" asChild>
                <Link to="/link-bank">Link Bank Account</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLinkedAccounts}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Real Payment Processing
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Payment Type Selection */}
        <div className="space-y-2">
          <Label>Payment Type</Label>
          <Select value={paymentType} onValueChange={(value: "contribution" | "payout") => setPaymentType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contribution">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Contribution (Debit from your account)
                </div>
              </SelectItem>
              {isAdmin && (
                <SelectItem value="payout">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payout (Credit to member account)
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Bank Account Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Bank Account</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchLinkedAccounts}
              disabled={accountsLoading}
            >
              {accountsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent>
              {linkedAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{account.institution_name}</span>
                    <span className="text-muted-foreground">
                      {account.account_name} •••• {account.mask}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedAccountData && (
            <div className="text-xs text-muted-foreground">
              Account: {selectedAccountData.account_name} •••• {selectedAccountData.mask}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            <Link to="/link-bank" className="text-primary hover:underline">
              + Add another bank account
            </Link>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label>Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount"
              className="pl-10"
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {paymentType === "contribution" 
              ? `Default contribution: ${formatCurrency(contributionAmount)}`
              : "Enter payout amount"
            }
          </div>
        </div>

        {/* Contribution Status Warning */}
        {paymentType === "contribution" && contributionStatus.blockingReason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{contributionStatus.blockingReason}</p>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={!canProcessPayment}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {paymentType === "contribution" && contributionStatus.hasProcessingContribution
                ? "Processing Contribution..."
                : paymentType === "contribution" && !contributionStatus.canContribute
                  ? "Cannot Contribute"
                  : paymentType === "contribution" 
                    ? "Make Contribution" 
                    : "Process Payout"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        {/* Processing Results */}
        {processingResults && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Initiated</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center justify-between">
                <span>Transfer ID:</span>
                <span className="font-mono text-xs">{processingResults.transfer_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Amount:</span>
                <span className="font-medium">{formatCurrency(processingResults.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge className={getTransferStatusColor(processingResults.status)}>
                  {getTransferStatusIcon(processingResults.status)} {getTransferStatusText(processingResults.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated Completion:</span>
                <span className="text-xs">{processingResults.estimated_completion}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200">
              <Button 
                onClick={handleStatusCheck}
                variant="outline" 
                size="sm"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
          </div>
        )}

        {/* Transfer Status */}
        {transferStatus && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Transfer Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge className={getTransferStatusColor(transferStatus.status)}>
                  {getTransferStatusIcon(transferStatus.status)} {getTransferStatusText(transferStatus.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Amount:</span>
                <span className="font-medium">{formatTransferAmount(transferStatus.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Network:</span>
                <span className="text-xs uppercase">{transferStatus.network}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="text-xs">{new Date(transferStatus.created).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Updated:</span>
                <span className="text-xs">{new Date(transferStatus.last_updated).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Important Notes */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Contributions:</strong> 2-3 business days to process
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Payouts:</strong> 1-2 business days to process
            </span>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Note:</strong> All transfers are processed through secure ACH networks
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealPaymentProcessor;
