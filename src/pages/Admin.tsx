import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  goal_id?: string;
};

export default function AdminPage() {
  const [advanceTimeByDays, setAdvanceTimeByDays] = useState<number>(7);

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

  const clockIds = useMemo(() => Object.keys(data || {}), [data]);

  const handleAdvanceClock = async (testClockId: string, recurringTransferId?: string) => {
    try {
      const now = new Date();
      const target = new Date(now);
      target.setDate(now.getDate() + (advanceTimeByDays || 1));
      target.setHours(23, 59, 0, 0);

      const { data, error } = await supabase.functions.invoke('admin-recurring', {
        body: {
          action: 'advance_clock',
          test_clock_id: testClockId,
          virtual_time_iso: target.toISOString(),
          recurring_transfer_id: recurringTransferId
        }
      });
      if (error || !data?.advanced) throw new Error(data?.error || error?.message || 'Advance failed');
      toast.success('Clock advanced', { description: `${testClockId} → ${target.toISOString()}` });
      await refetch();
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sandbox Admin - Test Clocks</h1>
        <p className="text-sm text-muted-foreground">Manage Plaid sandbox test clocks and recurring transfers. Not linked in navigation.</p>
      </div>

      <Card className="p-4">
        <div className="flex items-end gap-4">
          <div className="grid gap-2">
            <Label>Advance by days</Label>
            <Input type="number" value={advanceTimeByDays} onChange={e => setAdvanceTimeByDays(parseInt(e.target.value || '0'))} className="w-40" />
          </div>
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
              <h2 className="font-medium">Test Clock</h2>
              <p className="text-sm text-muted-foreground">{clockId}</p>
            </div>
            <Button onClick={() => handleAdvanceClock(clockId)}>Advance Clock</Button>
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
                <div className="mt-3 flex flex-wrap gap-2">
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
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}


