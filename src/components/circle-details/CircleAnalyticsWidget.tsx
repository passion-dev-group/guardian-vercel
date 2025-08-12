import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import ContributionTrendsChart from "./analytics/ContributionTrendsChart";
import MemberPerformanceChart from "./analytics/MemberPerformanceChart";
import FinancialHealthMetrics from "./analytics/FinancialHealthMetrics";

interface CircleAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalContributions: number;
  totalPayouts: number;
  netFunds: number;
  averageContribution: number;
  completionRate: number;
  rotationProgress: number;
  monthlyGrowth: number;
  memberEngagement: number;
}

interface CircleAnalyticsWidgetProps {
  circleId: string;
}

const CircleAnalyticsWidget = ({ circleId }: CircleAnalyticsWidgetProps) => {
  const [analytics, setAnalytics] = useState<CircleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAnalytics();
  }, [circleId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get circle members and transactions
      const [membersResponse, transactionsResponse] = await Promise.all([
        supabase
          .from('circle_members')
          .select('user_id, payout_position, profiles!inner(display_name)')
          .eq('circle_id', circleId),
        supabase
          .from('circle_transactions')
          .select('amount, type, status, transaction_date, user_id')
          .eq('circle_id', circleId)
          .eq('status', 'completed')
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;

      const members = membersResponse.data || [];
      const transactions = transactionsResponse.data || [];

      // Calculate analytics
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
      const completionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
      const rotationProgress = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

      // Calculate monthly growth (simplified - compare last 2 months)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const lastMonthContributions = transactions.filter(tx => 
        tx.type === 'contribution' && 
        new Date(tx.transaction_date) >= lastMonth
      ).reduce((sum, tx) => sum + tx.amount, 0);

      const twoMonthsAgoContributions = transactions.filter(tx => 
        tx.type === 'contribution' && 
        new Date(tx.transaction_date) >= twoMonthsAgo && 
        new Date(tx.transaction_date) < lastMonth
      ).reduce((sum, tx) => sum + tx.amount, 0);

      const monthlyGrowth = twoMonthsAgoContributions > 0 
        ? ((lastMonthContributions - twoMonthsAgoContributions) / twoMonthsAgoContributions) * 100 
        : 0;

      // Calculate member engagement (members who contributed in last month)
      const lastMonthContributors = new Set(
        transactions.filter(tx => 
          tx.type === 'contribution' && 
          new Date(tx.transaction_date) >= lastMonth
        ).map(tx => tx.user_id)
      );
      const memberEngagement = totalMembers > 0 ? (lastMonthContributors.size / totalMembers) * 100 : 0;

      setAnalytics({
        totalMembers,
        activeMembers,
        totalContributions,
        totalPayouts,
        netFunds,
        averageContribution,
        completionRate,
        rotationProgress,
        monthlyGrowth,
        memberEngagement
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Circle Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Circle Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {analytics.totalMembers}
                </div>
                <div className="text-xs text-blue-700">Total Members</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {analytics.activeMembers}
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
                  <span className="font-medium">{formatCurrency(analytics.totalContributions)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Payouts</span>
                  <span className="font-medium">{formatCurrency(analytics.totalPayouts)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Net Funds</span>
                  <span className={analytics.netFunds >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(analytics.netFunds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Performance Metrics</h4>
              
              <div className="space-y-3">
                {/* Completion Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Circle Completion</span>
                    <span className="font-medium">{Math.round(analytics.completionRate)}%</span>
                  </div>
                  <Progress value={analytics.completionRate} className="h-2" />
                </div>

                {/* Monthly Growth */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Growth</span>
                  <span className={`font-medium ${analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.monthlyGrowth >= 0 ? '+' : ''}{Math.round(analytics.monthlyGrowth)}%
                  </span>
                </div>

                {/* Member Engagement */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member Engagement</span>
                  <span className="font-medium">{Math.round(analytics.memberEngagement)}%</span>
                </div>

                {/* Average Contribution */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Contribution</span>
                  <span className="font-medium">{formatCurrency(analytics.averageContribution)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Contribution Trends</h4>
              <ContributionTrendsChart circleId={circleId} />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Member Performance</h4>
              <MemberPerformanceChart circleId={circleId} />
              <FinancialHealthMetrics circleId={circleId} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CircleAnalyticsWidget;
