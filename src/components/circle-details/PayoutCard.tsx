import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCirclePayouts } from "@/hooks/useCirclePayouts";
import { useAuth } from "@/contexts/AuthContext";
import { plaidService } from "@/lib/plaid";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { PaymentNotificationService } from "@/lib/notifications";
import { 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface PayoutCardProps {
  circleId: string;
  circleName: string;
  isAdmin: boolean;
}

export function PayoutCard({ circleId, circleName, isAdmin }: PayoutCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { payoutInfo, loading, refreshPayoutInfo } = useCirclePayouts(circleId);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  const handleProcessPayout = async () => {
    if (!user || !payoutInfo.nextPayoutMember) return;

    // Check if funds are actually available for payout
    if (payoutInfo.availablePool <= 0) {
      toast({
        title: "No Funds Available",
        description: payoutInfo.pendingContributions > 0 
          ? `${payoutInfo.pendingContributions} contributions are still processing. Please wait for funds to become available.`
          : "No funds are currently available for payout.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayout(true);

    // Show pending notification
    PaymentNotificationService.showPendingNotification('payout', payoutInfo.availablePool, circleName);

    try {
      const payoutResult = await plaidService.processCirclePayout({
        circle_id: circleId,
        member_id: payoutInfo.nextPayoutMember.id,
        admin_user_id: user.id,
        payout_amount: payoutInfo.availablePool,
      });

      if (payoutResult.success) {
        // Track the payout event
        trackEvent('circle_payout_processed', {
          circle_id: circleId,
          circle_name: circleName,
          amount: payoutResult.amount,
          member_id: payoutInfo.nextPayoutMember.user_id,
          transaction_id: payoutResult.transaction_id,
        });

        // Show success notification
        PaymentNotificationService.showPaymentNotification({
          type: 'payout',
          success: true,
          amount: payoutResult.amount,
          circleName: circleName,
          transactionId: payoutResult.transaction_id,
          recipientName: payoutInfo.nextPayoutMember.profile.display_name,
        });

        // Refresh payout info
        refreshPayoutInfo();
      } else {
        throw new Error(payoutResult.message || payoutResult.error || "Payout processing failed");
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      
      // Show error notification
      PaymentNotificationService.showPaymentNotification({
        type: 'payout',
        success: false,
        amount: payoutInfo.availablePool,
        circleName: circleName,
        transactionId: '',
        error: error instanceof Error ? error.message : "There was an error processing the payout. Please try again.",
      });
    } finally {
      setIsProcessingPayout(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payout Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payout Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pool Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Total Pool</span>
            </div>
            <div className="text-lg font-semibold mt-1">
              {formatCurrency(payoutInfo.totalPool)}
            </div>
          </div>
          
          <div className={`rounded-lg p-3 ${payoutInfo.availablePool > 0 ? 'bg-primary/10' : 'bg-orange/10'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Available</span>
            </div>
            <div className={`text-lg font-semibold mt-1 ${payoutInfo.availablePool > 0 ? 'text-primary' : 'text-orange-600'}`}>
              {formatCurrency(payoutInfo.availablePool)}
            </div>
          </div>
        </div>

        {/* Pending Contributions Alert */}
        {payoutInfo.pendingContributions > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Contributions Processing</AlertTitle>
            <AlertDescription>
              {payoutInfo.pendingContributions} contribution{payoutInfo.pendingContributions > 1 ? 's are' : ' is'} still processing. 
              Funds will become available for payout once confirmed by the bank (typically 1-3 business days).
            </AlertDescription>
          </Alert>
        )}

        {/* Next Payout Member */}
        {payoutInfo.nextPayoutMember ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Next Payout</h4>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Position #{payoutInfo.nextPayoutMember.payout_position}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {payoutInfo.nextPayoutMember.profile.avatar_url ? (
                  <AvatarImage src={payoutInfo.nextPayoutMember.profile.avatar_url} />
                ) : (
                  <AvatarFallback>
                    {payoutInfo.nextPayoutMember.profile.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <div className="font-medium">
                  {payoutInfo.nextPayoutMember.profile.display_name || "Anonymous User"}
                </div>
                {payoutInfo.nextPayoutMember.next_payout_date && (
                  <div className="text-sm text-muted-foreground">
                    Scheduled: {formatDateRelative(new Date(payoutInfo.nextPayoutMember.next_payout_date))}
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-3">
                <Button 
                  className="w-full" 
                  onClick={handleProcessPayout}
                  disabled={isProcessingPayout || payoutInfo.availablePool <= 0}
                >
                  {isProcessingPayout ? "Processing..." : `Process Payout (${formatCurrency(payoutInfo.availablePool)})`}
                </Button>
                {payoutInfo.availablePool <= 0 && payoutInfo.pendingContributions > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    Waiting for {payoutInfo.pendingContributions} contribution{payoutInfo.pendingContributions > 1 ? 's' : ''} to clear
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-5 w-5" />
              <span>No Payouts Scheduled</span>
            </div>
            <p className="text-sm text-muted-foreground">
              All members have received their payouts or no payout positions are set.
            </p>
          </div>
        )}

        {/* Payout History */}
        {payoutInfo.payoutHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Recent Payouts</h4>
            <div className="space-y-2">
              {payoutInfo.payoutHistory.slice(0, 3).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{payout.profile.display_name || "Anonymous"}</span>
                    <Badge 
                      variant={payout.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {payout.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(payout.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateRelative(new Date(payout.transaction_date))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 