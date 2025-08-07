
import React, { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CircleActivityChartProps {
  startDate: string;
  endDate: string;
  frequency?: string;
}

interface ActivityData {
  date: string;
  active: number;
  completed: number;
}

export const CircleActivityChart: React.FC<CircleActivityChartProps> = ({
  startDate,
  endDate,
  frequency,
}) => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_circle_activity_over_time', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_frequency: frequency === 'all' ? null : frequency
        });

        if (error) throw error;

        // Transform data for the chart
        const formattedData = (data || []).map(item => ({
          date: item.date,
          active: item.active_circles,
          completed: item.completed_circles
        }));

        setData(formattedData);
      } catch (error) {
        console.error("Error loading circle activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, frequency]);

  // Chart configuration
  const chartConfig = useMemo(() => ({
    active: { stroke: "#8B5CF6", fill: "#E5DEFF" },
    completed: { stroke: "#10B981", fill: "#D1FAE5" }
  }), []);

  if (loading) {
    return <Skeleton className="h-[300px]" />;
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="active" 
            name="Active Circles" 
            stroke={chartConfig.active.stroke} 
            fill={chartConfig.active.fill} 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="completed" 
            name="Completed Circles" 
            stroke={chartConfig.completed.stroke} 
            fill={chartConfig.completed.fill} 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
