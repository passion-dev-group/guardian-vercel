import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
// All admin operations are routed via secure edge function to avoid RLS issues

type RecurringRow = {
  id?: string;
  user_id: string;
  user_display_name?: string | null;
  user_email?: string | null;
  amount: number;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  plaid_recurring_transfer_id: string;
  test_clock_id: string | null;
  next_contribution_date: string | null;
  created_at?: string;
  updated_at?: string;
  circle_id?: string;
  circle_name?: string | null;
  goal_id?: string;
};

export default function AdminPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClockId, setCurrentClockId] = useState<string>('');
  const [currentClockTime, setCurrentClockTime] = useState<Date | null>(null);
  const [modalAdvanceDays, setModalAdvanceDays] = useState<number>(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-test-clocks'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: { action: 'list' }
      });
      if (error) throw error;
      return (data?.groups || {}) as Record<string, RecurringRow[]>;
    }
  });
  console.log(data);
  const clockIds = useMemo(() => Object.keys(data || {}), [data]);

  const openAdvanceModal = async (testClockId: string) => {
    try {
      setCurrentClockId(testClockId);
      setModalAdvanceDays(1);
      setIsModalOpen(true);

      // Fetch current test clock time
      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: {
          action: 'get_clock_time',
          test_clock_id: testClockId
        }
      });

      if (error || !data?.virtual_time) {
        console.warn('Could not fetch clock time, using current time');
        setCurrentClockTime(new Date());
      } else {
        setCurrentClockTime(new Date(data.virtual_time));
      }
    } catch (e) {
      console.warn('Error fetching clock time:', e);
      setCurrentClockTime(new Date());
    }
  };

  const closeAdvanceModal = () => {
    setIsModalOpen(false);
    setCurrentClockId('');
    setCurrentClockTime(null);
    setModalAdvanceDays(1);
  };

  const handleAdvanceClock = async (testClockId: string, recurringTransferId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: {
          action: 'advance_clock',
          test_clock_id: testClockId,
          days_to_advance: modalAdvanceDays || 1,
          recurring_transfer_id: recurringTransferId
        }
      });
      if (error || !data?.advanced) throw new Error(data?.error || error?.message || 'Advance failed');
      toast.success('Clock advanced', {
        description: `Advanced ${data.days_advanced} day(s), ${data.webhook_count || 0} webhook(s) sent`
      });
      await refetch();
      closeAdvanceModal();
      return data;
    } catch (e: any) {
      toast.error('Advance failed', { description: e?.message || 'Unknown error' });
    }
  };

  const handleSimulateStatus = async (transferId: string, status: 'posted' | 'pending' | 'cancelled' | 'failed' | 'returned') => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: { action: 'simulate_status', transfer_id: transferId, status }
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Simulation failed');
      toast.success('Simulation sent', { description: `${status} for ${transferId}` });
    } catch (e: any) {
      toast.error('Simulation failed', { description: e?.message || 'Unknown error' });
    }
  };

  const onClickSetContributed = async (circleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: { action: 'set_contributed', circle_id: circleId }
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Set contributed failed');
      toast.success('Set contributed', { description: `Set contributed for ${circleId}` });
    } catch (e: any) {
      toast.error('Set contributed failed', { description: e?.message || 'Unknown error' });
    }
  };

  return (
    <div className="w-[768px] mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sandbox Admin - Test Clocks</h1>
        <p className="text-sm text-muted-foreground">Manage Plaid sandbox test clocks and recurring transfers. Not linked in navigation.</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-6">Loading test clocks…</Card>
      )}
      {error && (
        <Card className="p-6 text-destructive">Failed to load: {(error as any).message}</Card>
      )}

      {!isLoading && !error && clockIds.length === 0 && (
        <Card className="p-6">No test clocks found yet.</Card>
      )}

      {clockIds.map(clockId => (
        <Card key={clockId} className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">
                {(data?.[clockId]?.[0]?.circle_name) || 'Test Clock'}
              </h2>
              <p className="text-sm text-muted-foreground">{clockId}</p>
            </div>
            <Button onClick={() => openAdvanceModal(clockId)}>Advance Clock</Button>
            <Separator orientation="vertical" />
            <Button onClick={() => onClickSetContributed(data?.[clockId]?.[0]?.circle_id)}>Set Contributed</Button>
          </div>

          <Separator />

          <div className="space-y-3">
            {(data?.[clockId] || []).map((row, idx) => (
              <div key={idx} className="p-3 rounded-md border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Recurring ID:</span> {row.plaid_recurring_transfer_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">User:</span> {row.user_display_name || row.user_email || row.user_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Amount: ${row.amount.toFixed(2)} · Freq: {row.frequency}
                    </div>
                    {row.next_contribution_date && (
                      <div className="text-xs text-muted-foreground">Next: {new Date(row.next_contribution_date).toLocaleString()}</div>
                    )}
                  </div>

                  {/* <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleAdvanceClock(clockId, row.plaid_recurring_transfer_id)}>Advance for this recurring</Button>
                  </div> */}
                </div>

                {/* Simulation controls: auto-fetch latest transfer_id via Plaid for this recurring */}
                {/* <div className="mt-3 flex flex-wrap gap-2">
                  {['pending','posted','settled','funds_available','failed','returned','cancelled'].map(s => (
                    <Button key={s} size="sm" variant="ghost" onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke('admin-recurring', {
                          body: { action: 'latest_transfer_for_recurring', recurring_transfer_id: row.plaid_recurring_transfer_id }
                        });
                        if (error || !data?.transfer_id) throw new Error(data?.error || error?.message || 'No transfer found');
                        await handleSimulateStatus(data.transfer_id, s as any);
                      } catch (e: any) {
                        toast.error('Could not fetch latest transfer', { description: e?.message || 'Unknown error' });
                      }
                    }}>{s}</Button>
                  ))}
                </div> */}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Advance Clock Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Advance Test Clock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current Clock Time</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {currentClockTime ? currentClockTime.toLocaleString() : 'Loading...'}
              </p>
            </div>
            <div>
              <Label htmlFor="advance-days">Advance by (days)</Label>
              <Input
                id="advance-days"
                type="number"
                value={modalAdvanceDays}
                onChange={(e) => setModalAdvanceDays(parseInt(e.target.value) || 1)}
                min="1"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAdvanceModal}>
              Cancel
            </Button>
            <Button onClick={() => handleAdvanceClock(currentClockId)}>
              Advance Clock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


