
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils";
import { ContributionDialog } from "./ContributionDialog";
import { CreditCard, AlertCircle, Clock } from "lucide-react";
import { FrequencyType } from "@/types/frequency";
import { useContributionLimit } from "@/hooks/useContributionLimit";
import { AuthorizeRecurringACHButton } from "./AuthorizeRecurringACHButton";

interface CircleActionsPanelProps {
  circleId: string | undefined;
  isAdmin: boolean;
  circleName?: string;
  contributionAmount?: number;
  frequency?: FrequencyType;
  circleStatus?: string;
}

const CircleActionsPanel = ({
  circleId,
  isAdmin,
  circleName,
  contributionAmount,
  frequency,
  circleStatus
}: CircleActionsPanelProps) => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isCirclePaused, setIsCirclePaused] = useState(false);
  const [testClockInfo, setTestClockInfo] = useState<{ testClockId: string, recurringTransferId: string } | null>(null);
  const { toast } = useToast();



  // Get contribution limit status
  const contributionStatus = useContributionLimit(circleId);

  const generateInviteLink = async () => {
    if (!circleId) return;

    setIsGeneratingInvite(true);

    try {
      const user_id = (await supabase.auth.getUser()).data.user?.id;
      if (!user_id) throw new Error("User not authenticated");

      // Generate a random invite code
      const inviteCode = Array(8)
        .fill(0)
        .map(() => Math.random().toString(36).charAt(2))
        .join('');

      // Set expiry date (48 hours from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 48);

      // Create the invite in the database
      const { data, error } = await supabase
        .from('circle_invites')
        .insert({
          circle_id: circleId,
          created_by: user_id,
          invite_code: inviteCode,
          expires_at: expiryDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create the shareable link
      const link = `${window.location.origin}/join-circle?code=${inviteCode}`;
      setInviteLink(link);
      setInviteDialogOpen(true);

      trackEvent('circle_invite_link_generated', {
        circle_id: circleId,
      });
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast({
        title: "Error",
        description: "Failed to generate invite link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const toggleCircleStatus = async () => {
    // In a real app, this would update a status field in the circles table
    setIsCirclePaused(prev => !prev);

    toast({
      title: isCirclePaused ? "Circle Activated" : "Circle Paused",
      description: isCirclePaused
        ? "The circle is now active and can receive contributions."
        : "The circle has been paused. No contributions will be collected.",
    });

    trackEvent('circle_status_changed', {
      circle_id: circleId,
      new_status: isCirclePaused ? 'active' : 'paused',
    });
  };

  const handleWithdrawFunds = () => {
    // In a real app, this would initiate a withdrawal process
    toast({
      title: "Withdrawal Initiated",
      description: "Your withdrawal request has been initiated. Funds will be transferred to your linked bank account.",
    });

    trackEvent('circle_funds_withdrawn', {
      circle_id: circleId,
    });
  };

  const copyInviteLink = () => {
    copyToClipboard(inviteLink);

  };

  return (
    <>
      <div className="space-y-3">
        {/* Contribution Status Warning */}
        {contributionStatus.blockingReason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{contributionStatus.blockingReason}</p>
            </div>
          </div>
        )}

        {/* Temporarily hide direct contribution button */}
        {/* <Button 
          className="w-full"
          onClick={() => setContributionDialogOpen(true)}
          disabled={!contributionStatus.canContribute || contributionStatus.isLoading}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          {contributionStatus.hasProcessingContribution 
            ? "Processing Contribution..." 
            : contributionStatus.canContribute 
              ? "Make Contribution" 
              : "Cannot Contribute"}
        </Button> */}

        {/* New: Authorize Recurring ACH */}
        {circleName && contributionAmount && frequency && (
          <AuthorizeRecurringACHButton
            circleId={circleId!}
            circleName={circleName}
            contributionAmount={contributionAmount}
            frequency={frequency}
            circleStatus={circleStatus}
            isAdmin={isAdmin}
            className="w-full"
          />
        )}

        {/* Sandbox Test Clock Info and Controls */}        

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Scroll to payout section
              const payoutSection = document.getElementById('payout-heading');
              if (payoutSection) {
                payoutSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Payouts
          </Button>
        )}

        <Button
          className="w-full"
          onClick={generateInviteLink}
          disabled={isGeneratingInvite}
        >
          {isGeneratingInvite ? "Generating..." : "Generate New Invite Link"}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={toggleCircleStatus}
        >
          {isCirclePaused ? "Activate Circle" : "Pause Circle"}
        </Button>

        {isAdmin && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleWithdrawFunds}
          >
            Withdraw Funds
          </Button>
        )}
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Link Generated</DialogTitle>
            <DialogDescription>
              Share this link to invite people to join your circle. The link will expire in 48 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
            {inviteLink}
          </div>

          <div className="flex justify-end">
            <Button onClick={copyInviteLink}>
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {circleName && contributionAmount && frequency && (
        <ContributionDialog
          circleId={circleId!}
          circleName={circleName}
          contributionAmount={contributionAmount}
          frequency={frequency as FrequencyType}
          isOpen={contributionDialogOpen}
          onOpenChange={setContributionDialogOpen}
          onTestClockCreated={(testClockId, recurringTransferId) => {
            setTestClockInfo({ testClockId, recurringTransferId });
          }}
        />
      )}
    </>
  );
};

export default CircleActionsPanel;
