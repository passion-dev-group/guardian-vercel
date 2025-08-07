
import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface UserEngagementGraphProps {
  startDate: string;
  endDate: string;
}

interface EngagementData {
  month: string;
  active_users: number;
  new_signups: number;
}

export const UserEngagementGraph: React.FC<UserEngagementGraphProps> = ({
  startDate,
  endDate,
}) => {
  const [data, setData] = useState<EngagementData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_user_engagement_metrics', {
          p_start_date: startDate,
          p_end_date: endDate
        });

        if (error) throw error;

        setData(data || []);
      } catch (error) {
        console.error("Error loading user engagement data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Chart configuration
  const chartConfig = useMemo(() => ({
    active: "#8B5CF6",
    signups: "#0EA5E9"
  }), []);

  if (loading) {
    return <Skeleton className="h-[300px]" />;
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="active_users" name="Monthly Active Users" fill={chartConfig.active} />
          <Bar dataKey="new_signups" name="New Sign-ups" fill={chartConfig.signups} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
