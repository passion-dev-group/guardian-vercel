import { format } from 'date-fns';
import { useSoloSavingsTransactions } from '@/hooks/useSoloSavingsTransactions';
import { Card } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, AlertCircle } from 'lucide-react';

interface TransactionHistoryProps {
  goalId: string;
}

export default function TransactionHistory({ goalId }: TransactionHistoryProps) {
  const { transactions, isLoading, error } = useSoloSavingsTransactions(goalId);

  // Format currency amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get transaction icon based on type and status
  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'failed' || status === 'cancelled') {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    
    switch (type) {
      case 'manual_deposit':
        return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case 'recurring_contribution':
        return <ArrowUpCircle className="w-5 h-5 text-blue-500" />;
      case 'adjustment':
        return <ArrowDownCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <ArrowUpCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get transaction status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get transaction type display text
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'manual_deposit':
        return 'Manual Deposit';
      case 'recurring_contribution':
        return 'Recurring Contribution';
      case 'adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Transaction History</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Transaction History</h2>
        <div className="text-center py-8 text-destructive">
          <p>Failed to load transactions</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Transaction History</h2>
      
      {(!transactions || transactions.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getTransactionIcon(transaction.type, transaction.status)}
                <div>
                  <p className="font-medium">{getTypeDisplay(transaction.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(transaction.status)}`}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
