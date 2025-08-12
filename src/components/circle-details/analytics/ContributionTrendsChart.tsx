import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Loader2 } from "lucide-react";

interface ContributionTrendsChartProps {
  circleId: string;
}

interface ChartData {
  period: string;
  contributions: number;
  payouts: number;
  netAmount: number;
  memberCount: number;
}

const ContributionTrendsChart = ({ circleId }: ContributionTrendsChartProps) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("6months");
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    fetchTrendsData();
  }, [circleId, timeframe]);

  const fetchTrendsData = async () => {
    try {
      setLoading(true);

      // Get transactions for the specified timeframe
      const startDate = new Date();
      let monthsBack = 6;
      
      switch (timeframe) {
        case "3months":
          monthsBack = 3;
          break;
        case "6months":
          monthsBack = 6;
          break;
        case "12months":
          monthsBack = 12;
          break;
        case "1year":
          monthsBack = 12;
          break;
      }
      
      startDate.setMonth(startDate.getMonth() - monthsBack);

      const { data: transactions, error } = await supabase
        .from('circle_transactions')
        .select('amount, type, status, transaction_date')
        .eq('circle_id', circleId)
        .eq('status', 'completed')
        .gte('transaction_date', startDate.toISOString())
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Group data by month
      const monthlyData = new Map<string, ChartData>();
      
      // Initialize all months in the range
      for (let i = monthsBack; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        
        monthlyData.set(monthKey, {
          period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          contributions: 0,
          payouts: 0,
          netAmount: 0,
          memberCount: 0
        });
      }

      // Aggregate transaction data
      transactions?.forEach(tx => {
        const monthKey = tx.transaction_date.slice(0, 7);
        const existing = monthlyData.get(monthKey);
        
        if (existing) {
          if (tx.type === 'contribution') {
            existing.contributions += tx.amount;
          } else if (tx.type === 'payout') {
            existing.payouts += tx.amount;
          }
          existing.netAmount = existing.contributions - existing.payouts;
        }
      });

      // Convert to array and sort by date
      const sortedData = Array.from(monthlyData.values()).sort((a, b) => {
        const aDate = new Date(a.period);
        const bDate = new Date(b.period);
        return aDate.getTime() - bDate.getTime();
      });

      setChartData(sortedData);

    } catch (error) {
      console.error("Error fetching trends data:", error);
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

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          No data available for the selected timeframe
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">Contributions: {formatCurrency(payload[0]?.value || 0)}</p>
          <p className="text-green-600">Payouts: {formatCurrency(payload[1]?.value || 0)}</p>
          <p className="text-purple-600">Net: {formatCurrency(payload[2]?.value || 0)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Contribution Trends
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3M</SelectItem>
                <SelectItem value="6months">6M</SelectItem>
                <SelectItem value="12months">12M</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="contributions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  name="Contributions"
                />
                <Line 
                  type="monotone" 
                  dataKey="payouts" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  name="Payouts"
                />
                <Line 
                  type="monotone" 
                  dataKey="netAmount" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                  name="Net Amount"
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="contributions" fill="#3b82f6" name="Contributions" />
                <Bar dataKey="payouts" fill="#10b981" name="Payouts" />
                <Bar dataKey="netAmount" fill="#8b5cf6" name="Net Amount" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.contributions, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Total Contributions</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.payouts, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Total Payouts</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.netAmount, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Net Growth</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributionTrendsChart;
