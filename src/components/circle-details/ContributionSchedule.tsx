
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface ScheduleEvent {
  date: Date;
  type: "contribution" | "payout";
  amount: number;
  member?: string;
}

interface ContributionScheduleProps {
  circleId: string | undefined;
}

const ContributionSchedule = ({ circleId }: ContributionScheduleProps) => {
  const [scheduleData, setScheduleData] = useState<{ date: string; contribution: number; payout: number }[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!circleId) return;
    
    const fetchScheduleData = async () => {
      setLoading(true);
      
      try {
        // Fetch circle details to get contribution amount and frequency
        const { data: circleData } = await supabase
          .from('circles')
          .select('contribution_amount, frequency')
          .eq('id', circleId)
          .single();
          
        if (!circleData) {
          setLoading(false);
          return;
        }
        
        // Fetch members first
        const { data: membersData } = await supabase
          .from('circle_members')
          .select(`
            user_id, next_payout_date
          `)
          .eq('circle_id', circleId)
          .not('next_payout_date', 'is', null)
          .order('next_payout_date', { ascending: true });
        
        // For each member, fetch their profile
        const events: ScheduleEvent[] = [];
        
        // Add known payouts
        if (membersData && membersData.length > 0) {
          for (const member of membersData) {
            if (member.next_payout_date) {
              // Get profile data
              const { data: profileData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', member.user_id)
                .maybeSingle();
              
              const memberName = profileData?.display_name || 'Unknown Member';
                
              events.push({
                date: new Date(member.next_payout_date),
                type: "payout",
                amount: circleData.contribution_amount,
                member: memberName
              });
            }
          }
        }
        
        // Add projected contributions (simplified example)
        const today = new Date();
        let contributionDate = new Date();
        
        // Generate next 6 contributions based on frequency
        for (let i = 0; i < 6; i++) {
          if (i > 0) {
            // Add days/weeks/months based on frequency
            if (circleData.frequency === 'weekly') {
              contributionDate.setDate(contributionDate.getDate() + 7);
            } else if (circleData.frequency === 'biweekly') {
              contributionDate.setDate(contributionDate.getDate() + 14);
            } else {
              // Monthly
              contributionDate.setMonth(contributionDate.getMonth() + 1);
            }
          }
          
          events.push({
            date: new Date(contributionDate),
            type: "contribution",
            amount: circleData.contribution_amount
          });
        }
        
        // Group by date for chart
        const groupedByDate = events.reduce((acc, event) => {
          const dateString = format(event.date, 'MMM d');
          
          if (!acc[dateString]) {
            acc[dateString] = { date: dateString, contribution: 0, payout: 0 };
          }
          
          if (event.type === 'contribution') {
            acc[dateString].contribution += event.amount;
          } else {
            acc[dateString].payout += event.amount;
          }
          
          return acc;
        }, {} as Record<string, { date: string; contribution: number; payout: number }>);
        
        // Convert to array and sort by date
        const chartData = Object.values(groupedByDate)
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          });
        
        setScheduleData(chartData);
      } catch (error) {
        console.error("Error fetching schedule data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchScheduleData();
  }, [circleId]);
  
  if (loading) {
    return <div className="text-center py-4">Loading schedule...</div>;
  }
  
  if (scheduleData.length === 0) {
    return <div className="text-center py-4">No schedule data available</div>;
  }
  
  const chartConfig = {
    contribution: {
      label: "Contributions",
      color: "#9b87f5", // Primary purple
    },
    payout: {
      label: "Payouts",
      color: "#7E69AB", // Secondary purple
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="w-full">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={scheduleData} barGap={2} width={undefined} height={undefined}>
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={40}
                tickFormatter={(value) => `$${value}`}
              />
              <Bar 
                dataKey="contribution" 
                fill="var(--color-contribution)" 
                radius={[4, 4, 0, 0]}
                name="Contributions"
              />
              <Bar 
                dataKey="payout" 
                fill="var(--color-payout)" 
                radius={[4, 4, 0, 0]} 
                name="Payouts"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [`$${value}`, name]}
                  />
                }
              />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#9b87f5] rounded"></div>
            <span>Contributions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#7E69AB] rounded"></div>
            <span>Payouts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributionSchedule;
