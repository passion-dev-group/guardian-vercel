import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Users, DollarSign, TrendingUp, Calendar, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CircleStats {
  totalMembers: number;
  activeMembers: number;
  totalContributions: number;
  totalPayouts: number;
  netFunds: number;
  averageContribution: number;
  nextPayoutAmount: number;
  nextPayoutDate: string | null;
  nextPayoutMember: string | null;
  rotationProgress: number;
  overdueMembers: number;
}

interface CircleStatsWidgetProps {
  circleId: string;
}

const CircleStatsWidget = ({ circleId }: CircleStatsWidgetProps) => {
  const [stats, setStats] = useState<CircleStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCircleStats = async () => {
      try {
        setLoading(true);

        // Get circle members
        const { data: members } = await supabase
          .from('circle_members')
          .select(`
            id,
            user_id,
            payout_position,
            next_payout_date,
            profiles!inner(display_name)
          `)
          .eq('circle_id', circleId);

        // Get all transactions for this circle
        const { data: transactions } = await supabase
          .from('circle_transactions')
          .select('amount, type, status, user_id')
          .eq('circle_id', circleId)
          .eq('status', 'completed');

        // Get overdue contributions
        const { data: overdueContributions } = await supabase
          .from('circle_transactions')
          .select('user_id')
          .eq('circle_id', circleId)
          .eq('type', 'contribution')
          .eq('status', 'failed');

        if (!members || !transactions) return;

        // Calculate statistics
        const totalMembers = members.length;
        const activeMembers = members.filter(m => m.payout_position !== null).length;
        
        let totalContributions = 0;
        let totalPayouts = 0;
        let contributionCount = 0;
        let payoutCount = 0;

        transactions.forEach(tx => {
          if (tx.type === 'contribution') {
            totalContributions += tx.amount;
            contributionCount++;
          } else if (tx.type === 'payout') {
            totalPayouts += tx.amount;
            payoutCount++;
          }
        });

        const netFunds = totalContributions - totalPayouts;
        const averageContribution = contributionCount > 0 ? totalContributions / contributionCount : 0;

        // Get next payout info
        const nextPayoutMember = members.find(m => m.payout_position === 1);
        const nextPayoutAmount = netFunds;
        const nextPayoutDate = nextPayoutMember?.next_payout_date || null;

        // Calculate rotation progress
        const rotationProgress = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

        // Count overdue members
        const overdueMemberIds = new Set(overdueContributions?.map(tx => tx.user_id) || []);
        const overdueMembers = overdueMemberIds.size;

        setStats({
          totalMembers,
          activeMembers,
          totalContributions,
          totalPayouts,
          netFunds,
          averageContribution,
          nextPayoutAmount,
          nextPayoutDate,
          nextPayoutMember: nextPayoutMember?.profiles?.[0]?.display_name || null,
          rotationProgress,
          overdueMembers
        });

      } catch (error) {
        console.error("Error fetching circle stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircleStats();
  }, [circleId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Circle Statistics
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

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Circle Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {stats.totalMembers}
            </div>
            <div className="text-xs text-blue-700">Total Members</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {stats.activeMembers}
            </div>
            <div className="text-xs text-green-700">Active</div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Financial Overview</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Contributions</span>
              <span className="font-medium">{formatCurrency(stats.totalContributions)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Payouts</span>
              <span className="font-medium">{formatCurrency(stats.totalPayouts)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Net Funds</span>
              <span className={stats.netFunds >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(stats.netFunds)}
              </span>
            </div>
          </div>
        </div>

        {/* Rotation Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rotation Progress</span>
            <span className="font-medium">{Math.round(stats.rotationProgress)}%</span>
          </div>
          <Progress value={stats.rotationProgress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {stats.activeMembers} of {stats.totalMembers} members have positions
          </div>
        </div>

        {/* Next Payout Info */}
        {stats.nextPayoutMember && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Next Payout</span>
            </div>
            <div className="text-green-700">
              <div className="font-medium text-sm">{stats.nextPayoutMember}</div>
              <div className="text-xs">{formatCurrency(stats.nextPayoutAmount)}</div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {stats.overdueMembers > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              <div className="font-medium">Overdue Members</div>
              <div className="text-xs">{stats.overdueMembers} member(s) have pending contributions</div>
            </div>
          </div>
        )}

        {/* Average Contribution */}
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-600">
            {formatCurrency(stats.averageContribution)}
          </div>
          <div className="text-xs text-gray-700">Average Contribution</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CircleStatsWidget;
