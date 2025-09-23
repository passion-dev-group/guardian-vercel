import { useState } from "react";
import { Play, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useCircleStartStatus } from "@/hooks/useCircleStartStatus";
import { plaidService } from "@/lib/plaid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StartCircleButtonProps {
  circleId: string;
  circleName: string;
  isAdmin: boolean;
  onCircleStarted?: () => void;
}

const StartCircleButton = ({ 
  circleId, 
  circleName, 
  isAdmin, 
  onCircleStarted 
}: StartCircleButtonProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  
  const {
    canStart,
    contributionPercentage,
    totalMembers,
    contributedMembers,
    isLoading,
    error,
    circleStatus,
    refreshStatus
  } = useCircleStartStatus(circleId);



  const handleStartCircle = async () => {
    if (!isAdmin || !canStart) return;

    setIsStarting(true);
    
    try {
      // Get circle details including frequency
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .select('frequency, contribution_amount')
        .eq('id', circleId)
        .single();

      if (circleError) {
        throw circleError;
      }

      // Get all authorized members with their bank account details
      const { data: authorizedMembers, error: authError } = await supabase
        .from('circle_ach_authorizations')
        .select(`
          user_id,
          plaid_account_id,
          linked_bank_account_id,
          linked_bank_accounts!inner(
            plaid_access_token,
            account_id
          )
        `)
        .eq('circle_id', circleId)
        .eq('status', 'authorized');

      if (authError) {
        throw authError;
      }

      if (!authorizedMembers || authorizedMembers.length === 0) {
        throw new Error('No authorized members found');
      }

      // Create a single test clock for this circle (all transfers will use the same clock)
      const testClockResponse = await plaidService.createTestClock(new Date().toISOString());

      if (!testClockResponse.success || !testClockResponse.test_clock_id) {
        throw new Error('Failed to create test clock for circle');
      }

      const testClockId = testClockResponse.test_clock_id;

      // Create recurring transfers for all authorized members using the same test clock
      const recurringTransferPromises = authorizedMembers.map(async (member) => {
        try {
          const recurringTransferResult = await plaidService.createRecurringTransfer({
            user_id: member.user_id,
            amount: circleData.contribution_amount,
            account_id: member.linked_bank_accounts[0].account_id,
            access_token: member.linked_bank_accounts[0].plaid_access_token,
            frequency: circleData.frequency,
            description: `Circle contribution for ${circleName}`,
            type: 'circle',
            target_id: circleId,
            target_name: circleName,
            test_clock_id: testClockId
          });

          if (!recurringTransferResult.success) {
            console.error(`Failed to create recurring transfer for user ${member.user_id}:`, recurringTransferResult.error);
            return { success: false, user_id: member.user_id, error: recurringTransferResult.error };
          }

          return { success: true, user_id: member.user_id, recurring_transfer_id: recurringTransferResult.recurring_transfer_id };
        } catch (error) {
          console.error(`Error creating recurring transfer for user ${member.user_id}:`, error);
          return { success: false, user_id: member.user_id, error: error.message };
        }
      });

      const transferResults = await Promise.all(recurringTransferPromises);
      const successfulTransfers = transferResults.filter(r => r.success);
      const failedTransfers = transferResults.filter(r => !r.success);

      if (successfulTransfers.length === 0) {
        throw new Error('Failed to create any recurring transfers');
      }

      // Update circle status to 'active'
      const { error: updateError } = await supabase
        .from('circles')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString().split('T')[0] // Set actual start date
        })
        .eq('id', circleId);

      if (updateError) {
        throw updateError;
      }

      // Initialize the rotation system
      const { data, error: rotationError } = await supabase.functions.invoke("manage-circle-rotation", {
        body: {
          circleId,
          action: "initialize",
          adminUserId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (rotationError || !data?.success) {
        throw new Error(data?.error || "Failed to initialize rotation");
      }

      // Track the event
      trackEvent('circle_started', {
        circle_id: circleId,
        circle_name: circleName,
        total_members: totalMembers,
        contribution_percentage: contributionPercentage,
        successful_transfers: successfulTransfers.length,
        failed_transfers: failedTransfers.length,
        test_clock_id: testClockId
      });

      // Show success message with details
      const successMessage = failedTransfers.length > 0 
        ? `${circleName} is now active! ${successfulTransfers.length} recurring transfers created successfully. ${failedTransfers.length} transfers failed - check logs.`
        : `${circleName} is now active! All ${successfulTransfers.length} recurring transfers created successfully.`;

      toast({
        title: "Circle Started! 🎉",
        description: successMessage,
      });

      // Refresh the status
      refreshStatus();
      
      // Notify parent component
      onCircleStarted?.();

    } catch (error) {
      console.error('Error starting circle:', error);
      toast({
        title: "Failed to Start Circle",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Don't show anything if not admin
  if (!isAdmin) return null;

  // Don't show if already started/active
  if (circleStatus === 'active' || circleStatus === 'started') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Circle Active</CardTitle>
          </div>
          <CardDescription>
            This circle is already running and accepting contributions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Show completed status
  if (circleStatus === 'completed') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Circle Completed</CardTitle>
          </div>
          <CardDescription>
            This circle has finished its payout cycle.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Circle Status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            <CardTitle className="text-lg">Start Circle</CardTitle>
          </div>
          <Badge variant={canStart ? "default" : "secondary"}>
            {canStart ? "Ready" : "Waiting"}
          </Badge>
        </div>
        <CardDescription>
          Circle can be started when 80% of members have contributed.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Authorized Members
            </span>
            <span className="font-medium">
              {contributedMembers} of {totalMembers} ({contributionPercentage}%)
            </span>
          </div>
          
          <Progress 
            value={contributionPercentage} 
            className="h-2"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Need 80% to start</span>
            <span className={contributionPercentage >= 80 ? "text-green-600" : "text-orange-600"}>
              {contributionPercentage >= 80 ? "Ready to start!" : `${80 - contributionPercentage}% more needed`}
            </span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={!canStart || isStarting}
              variant={canStart ? "default" : "secondary"}
            >
              <Play className="mr-2 h-4 w-4" />
              {isStarting ? "Starting Circle..." : "Start Circle"}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Circle: {circleName}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  You're about to start this savings circle with {totalMembers} members. 
                  {contributedMembers} members ({contributionPercentage}%) have authorized recurring contributions.
                </p>
                <p>
                  <strong>This action will:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Activate the circle and begin the payout rotation</li>
                  <li>Set payout positions for all members</li>
                  <li>Start the contribution schedule</li>
                  <li>This action cannot be undone</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartCircle} disabled={isStarting}>
                {isStarting ? "Starting..." : "Yes, Start Circle"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default StartCircleButton;
