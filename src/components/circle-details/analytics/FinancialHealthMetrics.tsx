import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Target,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface FinancialHealthMetricsProps {
  circleId: string;
}

interface FinancialHealth {
  totalContributions: number;
  totalPayouts: number;
  netFunds: number;
  averageContribution: number;
  contributionFrequency: number;
  payoutEfficiency: number;
  riskScore: number;
  sustainabilityScore: number;
  growthRate: number;
  overdueAmount: number;
  memberCount: number;
  activeMemberCount: number;
}

const FinancialHealthMetrics = ({ circleId }: FinancialHealthMetricsProps) => {
  const [healthData, setHealthData] = useState<FinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialHealth();
  }, [circleId]);

  const fetchFinancialHealth = async () => {
    try {
      setLoading(true);

      // Get comprehensive financial data
      const [membersResponse, transactionsResponse, overdueResponse] = await Promise.all([
        supabase
          .from('circle_members')
          .select('user_id, payout_position')
          .eq('circle_id', circleId),
        supabase
          .from('circle_transactions')
          .select('amount, type, status, transaction_date')
          .eq('circle_id', circleId)
          .eq('status', 'completed'),
        supabase
          .from('circle_transactions')
          .select('amount, user_id')
          .eq('circle_id', circleId)
          .eq('type', 'contribution')
          .eq('status', 'failed')
      ]);

      if (membersResponse.error) throw membersResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;

      const members = membersResponse.data || [];
      const transactions = transactionsResponse.data || [];
      const overdueTransactions = overdueResponse.data || [];

      // Calculate financial metrics
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
      const memberCount = members.length;
      const activeMemberCount = members.filter(m => m.payout_position !== null).length;

      // Calculate contribution frequency (contributions per month)
      const firstContribution = transactions
        .filter(tx => tx.type === 'contribution')
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())[0];
      
      let contributionFrequency = 0;
      if (firstContribution) {
        const monthsSinceStart = Math.max(1, Math.floor(
          (new Date().getTime() - new Date(firstContribution.transaction_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        contributionFrequency = contributionCount / monthsSinceStart;
      }

      // Calculate payout efficiency (how quickly payouts are processed)
      const payoutEfficiency = memberCount > 0 ? (activeMemberCount / memberCount) * 100 : 0;

      // Calculate overdue amount
      const overdueAmount = overdueTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate growth rate (monthly contribution growth)
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

      const growthRate = twoMonthsAgoContributions > 0 
        ? ((lastMonthContributions - twoMonthsAgoContributions) / twoMonthsAgoContributions) * 100 
        : 0;

      // Calculate risk score (0-100, higher = more risk)
      let riskScore = 0;
      if (overdueAmount > 0) riskScore += 30;
      if (contributionFrequency < 0.5) riskScore += 25;
      if (payoutEfficiency < 50) riskScore += 25;
      if (growthRate < -10) riskScore += 20;

      // Calculate sustainability score (0-100, higher = more sustainable)
      let sustainabilityScore = 100 - riskScore;
      if (contributionFrequency > 1) sustainabilityScore += 10;
      if (payoutEfficiency > 80) sustainabilityScore += 10;
      if (growthRate > 10) sustainabilityScore += 10;
      sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));

      setHealthData({
        totalContributions,
        totalPayouts,
        netFunds,
        averageContribution,
        contributionFrequency,
        payoutEfficiency,
        riskScore,
        sustainabilityScore,
        growthRate,
        overdueAmount,
        memberCount,
        activeMemberCount
      });

    } catch (error) {
      console.error("Error fetching financial health:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!healthData) return null;

  const getRiskLevel = (score: number) => {
    if (score <= 20) return { level: "Low", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle };
    if (score <= 50) return { level: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle };
    return { level: "High", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle };
  };

  const getSustainabilityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle };
    if (score >= 60) return { level: "Good", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Shield };
    if (score >= 40) return { level: "Fair", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle };
    return { level: "Poor", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle };
  };

  const riskInfo = getRiskLevel(healthData.riskScore);
  const sustainabilityInfo = getSustainabilityLevel(healthData.sustainabilityScore);
  const RiskIcon = riskInfo.icon;
  const SustainabilityIcon = sustainabilityInfo.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Financial Health
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Score Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg border ${riskInfo.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <RiskIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Risk Level</span>
            </div>
            <div className="text-lg font-bold">{healthData.riskScore}%</div>
            <div className="text-xs">{riskInfo.level}</div>
          </div>
          
          <div className={`p-3 rounded-lg border ${sustainabilityInfo.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <SustainabilityIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Sustainability</span>
            </div>
            <div className="text-lg font-bold">{healthData.sustainabilityScore}%</div>
            <div className="text-xs">{sustainabilityInfo.level}</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Key Metrics</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contribution Frequency</span>
              <span className="font-medium">{healthData.contributionFrequency.toFixed(1)}/month</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payout Efficiency</span>
              <span className="font-medium">{Math.round(healthData.payoutEfficiency)}%</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Growth Rate</span>
              <span className={`font-medium ${healthData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {healthData.growthRate >= 0 ? '+' : ''}{Math.round(healthData.growthRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Progress Indicators</h4>
          
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member Activity</span>
                <span className="font-medium">{healthData.activeMemberCount}/{healthData.memberCount}</span>
              </div>
              <Progress value={(healthData.activeMemberCount / healthData.memberCount) * 100} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fund Utilization</span>
                <span className="font-medium">{Math.round((healthData.totalPayouts / Math.max(healthData.totalContributions, 1)) * 100)}%</span>
              </div>
              <Progress value={(healthData.totalPayouts / Math.max(healthData.totalContributions, 1)) * 100} className="h-2" />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {healthData.overdueAmount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="text-sm text-red-700">
              <div className="font-medium">Overdue Contributions</div>
              <div className="text-xs">{formatCurrency(healthData.overdueAmount)} in pending payments</div>
            </div>
          </div>
        )}

        {healthData.growthRate < -10 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <TrendingDown className="h-4 w-4 text-yellow-600" />
            <div className="text-sm text-yellow-700">
              <div className="font-medium">Declining Growth</div>
              <div className="text-xs">Contributions decreased by {Math.abs(Math.round(healthData.growthRate))}%</div>
            </div>
          </div>
        )}

        {healthData.sustainabilityScore >= 80 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="text-sm text-green-700">
              <div className="font-medium">Excellent Health</div>
              <div className="text-xs">Circle is performing exceptionally well</div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(healthData.netFunds)}
            </div>
            <div className="text-xs text-muted-foreground">Available Funds</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(healthData.averageContribution)}
            </div>
            <div className="text-xs text-muted-foreground">Avg. Contribution</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialHealthMetrics;
