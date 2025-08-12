import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { DollarSign, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface ContributionSummary {
  totalContributions: number;
  totalPayouts: number;
  netSavings: number;
  thisMonthContributions: number;
  thisMonthPayouts: number;
  nextContributionDate: string | null;
  overdueContributions: number;
  circlesWithActivity: number;
}

const ContributionSummaryWidget = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributionSummary = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get user's circles
        const { data: userCircles } = await supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', user.id);

        if (!userCircles || userCircles.length === 0) {
          setSummary({
            totalContributions: 0,
            totalPayouts: 0,
            netSavings: 0,
            thisMonthContributions: 0,
            thisMonthPayouts: 0,
            nextContributionDate: null,
            overdueContributions: 0,
            circlesWithActivity: 0
          });
          return;
        }

        const circleIds = userCircles.map(c => c.circle_id);

        // Get this month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get all transactions for user's circles
        const { data: transactions } = await supabase
          .from('circle_transactions')
          .select('amount, type, status, transaction_date, circle_id')
          .in('circle_id', circleIds)
          .eq('user_id', user.id)
          .eq('status', 'completed');

        // Get overdue contributions
        const { data: overdueContributions } = await supabase
          .from('circle_transactions')
          .select('amount')
          .in('circle_id', circleIds)
          .eq('user_id', user.id)
          .eq('type', 'contribution')
          .eq('status', 'failed');

        // Calculate summary
        let totalContributions = 0;
        let totalPayouts = 0;
        let thisMonthContributions = 0;
        let thisMonthPayouts = 0;
        let circlesWithActivity = new Set();

        transactions?.forEach(transaction => {
          if (transaction.type === 'contribution') {
            totalContributions += transaction.amount;
            const txDate = new Date(transaction.transaction_date);
            if (txDate >= startOfMonth && txDate <= endOfMonth) {
              thisMonthContributions += transaction.amount;
            }
          } else if (transaction.type === 'payout') {
            totalPayouts += transaction.amount;
            const txDate = new Date(transaction.transaction_date);
            if (txDate >= startOfMonth && txDate <= endOfMonth) {
              thisMonthPayouts += transaction.amount;
            }
          }
          circlesWithActivity.add(transaction.circle_id);
        });

        const netSavings = totalContributions - totalPayouts;
        const overdueAmount = overdueContributions?.reduce((sum, t) => sum + t.amount, 0) || 0;

        setSummary({
          totalContributions,
          totalPayouts,
          netSavings,
          thisMonthContributions,
          thisMonthPayouts,
          nextContributionDate: null, // We'll calculate this separately
          overdueContributions: overdueAmount,
          circlesWithActivity: circlesWithActivity.size
        });

      } catch (error) {
        console.error("Error fetching contribution summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributionSummary();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contribution Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const savingsProgress = summary.totalContributions > 0 
    ? Math.min((summary.netSavings / summary.totalContributions) * 100, 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Contribution Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Savings Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Net Savings</span>
            <span className="font-medium">{formatCurrency(summary.netSavings)}</span>
          </div>
          <Progress value={savingsProgress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {summary.totalContributions > 0 
              ? `${Math.round(savingsProgress)}% of total contributions`
              : "No contributions yet"
            }
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(summary.thisMonthContributions)}
            </div>
            <div className="text-xs text-green-700">This Month</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {summary.circlesWithActivity}
            </div>
            <div className="text-xs text-blue-700">Active Circles</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Contributed</span>
            <span className="font-medium">{formatCurrency(summary.totalContributions)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Received</span>
            <span className="font-medium">{formatCurrency(summary.totalPayouts)}</span>
          </div>
        </div>

        {/* Alerts */}
        {summary.overdueContributions > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-sm text-red-700">
              <div className="font-medium">Overdue Contributions</div>
              <div className="text-xs">{formatCurrency(summary.overdueContributions)} pending</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/savings-goals">View Goals</Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/transactions">Transaction History</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributionSummaryWidget;
