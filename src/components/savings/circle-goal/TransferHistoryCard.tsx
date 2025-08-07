
import { format } from 'date-fns';
import { Clock, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Transfer {
  id: string;
  status: string;
  executed_at: string | null;
  scheduled_for: string;
  amount: number;
}

interface TransferHistoryCardProps {
  transfers: Transfer[] | undefined;
  isLoadingTransfers: boolean;
  formatCurrency: (amount: number) => string;
}

export function TransferHistoryCard({ 
  transfers, 
  isLoadingTransfers, 
  formatCurrency 
}: TransferHistoryCardProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Transfer History
        </CardTitle>
        <CardDescription>
          View the history of automated and manual transfers
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoadingTransfers ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading transfers...</p>
          </div>
        ) : transfers?.length ? (
          <div className="space-y-2">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="flex justify-between items-center py-2">
                <div>
                  <p className="text-sm font-medium">
                    {transfer.status === 'completed' ? 'Deposit Completed' : 
                     transfer.status === 'pending' ? 'Scheduled Transfer' :
                     transfer.status === 'failed' ? 'Transfer Failed' : 'Transfer Cancelled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transfer.executed_at 
                      ? format(new Date(transfer.executed_at), 'MMM d, yyyy')
                      : format(new Date(transfer.scheduled_for), 'MMM d, yyyy')}
                  </p>
                </div>
                
                <div className="flex items-center">
                  <p className={`font-medium ${
                    transfer.status === 'completed' ? 'text-green-600' : 
                    transfer.status === 'pending' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {formatCurrency(transfer.amount)}
                  </p>
                  <div className={`ml-2 h-2 w-2 rounded-full ${
                    transfer.status === 'completed' ? 'bg-green-500' :
                    transfer.status === 'pending' ? 'bg-blue-500' : 
                    'bg-red-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border rounded-md bg-muted/30">
            <List className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No transfers yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Transfers will appear here once scheduled or completed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
