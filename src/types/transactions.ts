export interface Transaction {
  id: string;
  circle_id: string;
  user_id: string;
  amount: number;
  type: 'contribution' | 'payout';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_date: string;
  created_at: string;
  description: string | null;
  plaid_transfer_id?: string;
  plaid_authorization_id?: string;
}

export interface TransactionWithDetails extends Transaction {
  circle: {
    id: string;
    name: string;
    contribution_amount: number;
    frequency: string;
  };
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  recipient?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface TransactionFilters {
  circleId?: string;
  userId?: string;
  type?: 'contribution' | 'payout';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionStats {
  totalContributions: number;
  totalPayouts: number;
  pendingAmount: number;
  completedAmount: number;
  failedAmount: number;
  transactionCount: number;
}

// Automated Scheduling Types
export interface RecurringContribution {
  id: string;
  user_id: string;
  circle_id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0-6 (Sunday-Saturday)
  day_of_month?: number; // 1-31
  is_active: boolean;
  next_contribution_date: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringContributionWithDetails extends RecurringContribution {
  circle: {
    id: string;
    name: string;
    contribution_amount: number;
    frequency: string;
  };
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  last_contribution?: Transaction;
  next_contribution_date_formatted: string;
  status: 'active' | 'paused' | 'overdue';
}

export interface CreateRecurringContributionData {
  circle_id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
}

export interface UpdateRecurringContributionData {
  amount?: number;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  is_active?: boolean;
}

// Transaction History Response Types
export interface TransactionHistoryResponse {
  transactions: TransactionWithDetails[];
  total: number;
  hasMore: boolean;
  stats: TransactionStats;
}

export interface RecurringContributionsResponse {
  recurringContributions: RecurringContributionWithDetails[];
  total: number;
  activeCount: number;
  pausedCount: number;
  overdueCount: number;
} 