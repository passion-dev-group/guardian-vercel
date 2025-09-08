import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { plaidService } from '@/lib/plaid';
import { formatCurrency } from '@/lib/utils';
import { Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface RecurringTransferStatusProps {
  circleId: string;
  circleName: string;
}

export function RecurringTransferStatus({ circleId, circleName }: RecurringTransferStatusProps) {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch recurring transfer status
  const { data: recurringTransfer, isLoading, error } = useQuery({
    queryKey: ['recurringTransfer', circleId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('recurring_contributions')
        .select('*')
        .eq('circle_id', circleId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!circleId,
  });

  const handleCancelRecurringTransfer = async () => {
    if (!recurringTransfer?.plaid_recurring_transfer_id) return;

    setIsUpdating(true);
    try {
      // Get linked bank account
      const { data: linkedAccount } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (!linkedAccount) {
        throw new Error('No linked bank account found');
      }

      // Cancel recurring transfer in Plaid
      await plaidService.cancelRecurringTransfer({
        recurring_transfer_id: recurringTransfer.plaid_recurring_transfer_id,
        access_token: linkedAccount.plaid_access_token,
      });

      // Update status in database
      await supabase
        .from('recurring_contributions')
        .update({ is_active: false })
        .eq('id', recurringTransfer.id);

      toast.success('Successfully cancelled recurring contribution');
    } catch (error) {
      console.error('Error cancelling recurring transfer:', error);
      toast.error('Failed to cancel recurring contribution');
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
            <span className="font-medium capitalize">{recurringTransfer.frequency}</span>
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
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleCancelRecurringTransfer}
          disabled={isUpdating}
        >
          {isUpdating ? 'Cancelling...' : 'Cancel Recurring Contribution'}
        </Button>
      </div>
    </Card>
  );
}
