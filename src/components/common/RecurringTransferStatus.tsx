import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { plaidService } from '@/lib/plaid';
import { formatCurrency } from '@/lib/utils';
import { Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useContributionLimit } from '@/hooks/useContributionLimit';

interface RecurringTransferStatusProps {
  type: 'circle' | 'savings_goal';
  targetId: string;
  targetName: string;
}

export function RecurringTransferStatus({ type, targetId, targetName }: RecurringTransferStatusProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get contribution status for circles to sync button states
  const contributionStatus = type === 'circle' ? useContributionLimit(targetId) : null;

  // Fetch recurring transfer status
  const { data: recurringTransfer, isLoading, error } = useQuery({
    queryKey: ['recurringTransfer', type, targetId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const tableName = type === 'circle' ? 'recurring_contributions' : 'solo_savings_recurring_contributions';
      const idField = type === 'circle' ? 'circle_id' : 'goal_id';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(idField, targetId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!targetId,
  });

  // Fetch circle status if this is a circle recurring transfer
  const { data: circleData } = useQuery({
    queryKey: ['circle', targetId],
    queryFn: async () => {
      if (type !== 'circle') return null;

      const { data, error } = await supabase
        .from('circles')
        .select('status')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: type === 'circle' && !!targetId,
  });

  // Check if cancellation is allowed based on circle status and contribution state
  const canCancelRecurringTransfer = () => {
    if (type !== 'circle') {
      // For savings goals, always allow cancellation
      return { canCancel: true, reason: null };
    }

    // Allow cancellation even if there's a processing contribution
    // Users need to cancel before the transfer reaches "posted" status
    // The processing contribution check is removed to allow cancellation during processing

    const circleStatus = circleData?.status || contributionStatus?.circleStatus;
    
    // Allow cancellation if:
    // 1. Circle hasn't started yet (pending)
    // 2. Circle cycle has completed
    // 3. Circle was cancelled
    if (circleStatus === 'pending' || circleStatus === 'completed' || circleStatus === 'cancelled') {
      return { canCancel: true, reason: null };
    }

    // Don't allow cancellation if circle is active/started (cycle is running)
    if (circleStatus === 'active' || circleStatus === 'started') {
      return { 
        canCancel: false, 
        reason: 'Cannot cancel recurring contribution while the circle cycle is active. Please wait until the current cycle completes.' 
      };
    }

    // Default to not allowing cancellation for unknown statuses
    return { 
      canCancel: false, 
      reason: 'Cannot cancel recurring contribution at this time. Please contact support if you need assistance.' 
    };
  };

  const handleCancelRecurringTransfer = async () => {
    if (!recurringTransfer?.plaid_recurring_transfer_id) return;

    // Check if cancellation is allowed
    const { canCancel, reason } = canCancelRecurringTransfer();
    
    if (!canCancel) {
      toast.error(reason || 'Cannot cancel recurring contribution at this time');
      return;
    }

    setIsUpdating(true);
    try {
      // Get linked bank accounts (user might have multiple)
      const { data: linkedAccounts, error: accountError } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (accountError) {
        throw accountError;
      }

      if (!linkedAccounts || linkedAccounts.length === 0) {
        throw new Error('No linked bank account found');
      }

      // Use the first active account (or you could let user choose)
      const linkedAccount = linkedAccounts[0];
      
      console.log('Cancelling recurring transfer:', {
        recurring_transfer_id: recurringTransfer.plaid_recurring_transfer_id,
        user_id: user?.id,
        account_count: linkedAccounts.length,
        account_id: linkedAccount.account_id
      });

      // Cancel recurring transfer in Plaid (this will also delete from database)
      const result = await plaidService.cancelRecurringTransfer({
        recurring_transfer_id: recurringTransfer.plaid_recurring_transfer_id,
        access_token: linkedAccount.plaid_access_token,
        user_id: user.id,
        type: type,
        target_id: targetId,
      });

      console.log('Cancellation result:', result);

      // Invalidate and refetch the recurring transfer query to update the UI
      await queryClient.invalidateQueries({ 
        queryKey: ['recurringTransfer', type, targetId, user?.id] 
      });

      // Trigger a manual refresh of contribution status by dispatching a custom event
      // This will allow the useContributionLimit hook to refresh its data
      window.dispatchEvent(new CustomEvent('recurring-contribution-cancelled', {
        detail: { targetId, type }
      }));

      // Show appropriate success message based on what actually happened
      if (result.plaid_cancelled) {
        toast.success('Successfully cancelled recurring contribution');
      } else {
        toast.success('Recurring contribution removed from your account', {
          description: 'The transfer may have already been processed by Plaid, but it has been removed from your account.'
        });
      }
    } catch (error) {
      console.error('Error cancelling recurring transfer:', error);
      toast.error(`Failed to cancel recurring contribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load recurring transfer status</p>
        </div>
      </Card>
    );
  }

  if (!recurringTransfer) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <XCircle className="h-5 w-5" />
          <p>No recurring contribution set up</p>
        </div>
      </Card>
    );
  }

  const { canCancel, reason } = canCancelRecurringTransfer();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <h3 className="font-medium">Active Recurring Contribution</h3>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{formatCurrency(recurringTransfer.amount)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Frequency:</span>
            <span className="font-medium capitalize">
              {recurringTransfer.frequency === 'biweekly' ? 'Every 2 weeks' :
               recurringTransfer.frequency === 'quarterly' ? 'Every 3 months' :
               recurringTransfer.frequency === 'yearly' ? 'Yearly' :
               recurringTransfer.frequency === 'daily' ? 'Daily' :
               `${recurringTransfer.frequency.charAt(0).toUpperCase()}${recurringTransfer.frequency.slice(1)}`}
            </span>
          </div>

          {recurringTransfer.day_of_week !== null && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Day of Week:</span>
              <span className="font-medium">
                {new Date(0, 0, recurringTransfer.day_of_week).toLocaleString('en-US', { weekday: 'long' })}
              </span>
            </div>
          )}

          {recurringTransfer.day_of_month !== null && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Day of Month:</span>
              <span className="font-medium">{recurringTransfer.day_of_month}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Next Transfer:</span>
            <span className="font-medium">
              {new Date(recurringTransfer.next_contribution_date).toLocaleDateString()}
            </span>
          </div>

          {type === 'circle' && circleData?.status && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Circle Status:</span>
              <span className="font-medium capitalize">
                {circleData.status === 'pending' && 'Not Started'}
                {circleData.status === 'active' && 'Active'}
                {circleData.status === 'started' && 'Active'}
                {circleData.status === 'completed' && 'Completed'}
                {circleData.status === 'cancelled' && 'Cancelled'}
              </span>
            </div>
          )}
        </div>

        {!canCancel && reason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{reason}</p>
            </div>
          </div>
        )}

        {canCancel && contributionStatus?.hasProcessingContribution && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                You can cancel now while the transfer is processing. Once it's posted, cancellation won't be possible.
              </p>
            </div>
          </div>
        )}

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleCancelRecurringTransfer}
          disabled={isUpdating || !canCancel}
        >
          {isUpdating ? 'Cancelling...' : 
           !canCancel ? 'Cannot Cancel (Circle Active)' : 
           contributionStatus?.hasProcessingContribution 
             ? 'Cancel Recurring (Processing)'
             : 'Cancel Recurring Contribution'}
        </Button>
      </div>
    </Card>
  );
}
