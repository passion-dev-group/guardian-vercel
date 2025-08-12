import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { Users, Trophy, Target, Loader2 } from "lucide-react";

interface MemberPerformanceChartProps {
  circleId: string;
}

interface MemberPerformance {
  user_id: string;
  display_name: string;
  total_contributions: number;
  contribution_count: number;
  last_contribution_date: string | null;
  average_contribution: number;
  is_admin: boolean;
  payout_position: number | null;
  performance_score: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const MemberPerformanceChart = ({ circleId }: MemberPerformanceChartProps) => {
  const [memberData, setMemberData] = useState<MemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar");

  useEffect(() => {
    fetchMemberPerformance();
  }, [circleId]);

  const fetchMemberPerformance = async () => {
    try {
      setLoading(true);

      // Get members with their contribution data
      const { data: members, error: membersError } = await supabase
        .from('circle_members')
        .select(`
          user_id,
          payout_position,
          is_admin,
          profiles!inner(display_name)
        `)
        .eq('circle_id', circleId);

      if (membersError) throw membersError;

      // Get all contributions for this circle
      const { data: transactions, error: transactionsError } = await supabase
        .from('circle_transactions')
        .select('amount, type, status, user_id, transaction_date')
        .eq('circle_id', circleId)
        .eq('type', 'contribution')
        .eq('status', 'completed');

      if (transactionsError) throw transactionsError;

      // Calculate performance for each member
      const memberPerformance: MemberPerformance[] = members?.map(member => {
        const memberTransactions = transactions?.filter(tx => tx.user_id === member.user_id) || [];
        
        const totalContributions = memberTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const contributionCount = memberTransactions.length;
        const averageContribution = contributionCount > 0 ? totalContributions / contributionCount : 0;
        
        // Get last contribution date
        const lastContribution = memberTransactions
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())[0];
        
        // Calculate performance score (combination of amount, frequency, and recency)
        let performanceScore = 0;
        if (contributionCount > 0) {
          performanceScore += (contributionCount / 12) * 40; // Frequency (40% weight)
          performanceScore += (totalContributions / 1000) * 40; // Amount (40% weight)
          
          // Recency bonus (20% weight)
          if (lastContribution) {
            const daysSinceLastContribution = Math.floor(
              (new Date().getTime() - new Date(lastContribution.transaction_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastContribution <= 30) performanceScore += 20;
            else if (daysSinceLastContribution <= 60) performanceScore += 10;
          }
        }

        return {
          user_id: member.user_id,
          display_name: member.profiles?.display_name || "Unknown User",
          total_contributions: totalContributions,
          contribution_count: contributionCount,
          last_contribution_date: lastContribution?.transaction_date || null,
          average_contribution: averageContribution,
          is_admin: member.is_admin || false,
          payout_position: member.payout_position,
          performance_score: Math.min(100, Math.round(performanceScore))
        };
      }) || [];

      // Sort by performance score (highest first)
      memberPerformance.sort((a, b) => b.performance_score - a.performance_score);

      setMemberData(memberPerformance);

    } catch (error) {
      console.error("Error fetching member performance:", error);
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

  if (memberData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          No member performance data available
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const member = memberData.find(m => m.display_name === label);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">Total: {formatCurrency(payload[0]?.value || 0)}</p>
          <p className="text-green-600">Count: {member?.contribution_count || 0}</p>
          <p className="text-purple-600">Avg: {formatCurrency(member?.average_contribution || 0)}</p>
          <p className="text-orange-600">Score: {member?.performance_score || 0}%</p>
        </div>
      );
    }
    return null;
  };

  const pieData = memberData.slice(0, 5).map((member, index) => ({
    name: member.display_name,
    value: member.total_contributions,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Performance
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {chartType === "bar" ? "Bar Chart" : "Pie Chart"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Performance Rankings */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-3">Top Performers</h4>
          <div className="space-y-2">
            {memberData.slice(0, 5).map((member, index) => (
              <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{member.display_name}</span>
                    {member.is_admin && (
                      <Badge variant="secondary" className="text-xs">👑 Admin</Badge>
                    )}
                    {member.payout_position === 1 && (
                      <Badge variant="default" className="text-xs">🎯 Next</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(member.total_contributions)}</div>
                    <div className="text-xs text-muted-foreground">{member.contribution_count} contributions</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{member.performance_score}%</div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={memberData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="display_name" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_contributions" fill="#3b82f6" name="Total Contributions" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {memberData.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Members</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(memberData.reduce((sum, m) => sum + m.total_contributions, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Total Contributions</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(memberData.reduce((sum, m) => sum + m.performance_score, 0) / memberData.length)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg. Performance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberPerformanceChart;
