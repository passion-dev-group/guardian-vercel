
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartKpiCardsProps {
  startDate: string;
  endDate: string;
  frequency?: string;
  userTier?: string;
}

export const ChartKpiCards: React.FC<ChartKpiCardsProps> = ({
  startDate,
  endDate,
  frequency,
  userTier,
}) => {
  const [metrics, setMetrics] = useState({
    totalCircles: 0,
    completionRate: 0,
    avgContribution: 0,
    defaultRate: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase.rpc('get_analytics_metrics', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_frequency: frequency === 'all' ? null : frequency
        });

        if (error) throw error;
        console.log('data', data);
        if (data) {
          setMetrics({
            totalCircles: data.total_circles || 0,
            completionRate: data.completion_rate || 0,
            avgContribution: data.avg_contribution || 0,
            defaultRate: data.default_rate || 0,
            isLoading: false
          });
        }
      } catch (error) {
        console.error("Error fetching analytics metrics:", error);
        setMetrics(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchMetrics();
  }, [startDate, endDate, frequency, userTier]);
  console.log('metrics', metrics);
  if (metrics.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="flex flex-col justify-between p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Circles Created</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.totalCircles.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col justify-between p-6">
          <div className="text-sm font-medium text-muted-foreground">Circle Completion Rate</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.completionRate.toLocaleString()}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col justify-between p-6">
          <div className="text-sm font-medium text-muted-foreground">Average Contribution</div>
          <div className="text-3xl font-bold mt-2">
            ${metrics.avgContribution.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col justify-between p-6">
          <div className="text-sm font-medium text-muted-foreground">Default Rate</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.defaultRate.toLocaleString()}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
