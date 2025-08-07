
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { ChartContainer } from "@/components/ui/chart";
import { ChartKpiCards } from "@/components/analytics/ChartKpiCards";
import { CircleActivityChart } from "@/components/analytics/CircleActivityChart";
import { UserEngagementGraph } from "@/components/analytics/UserEngagementGraph";
import { DefaultHeatmap } from "@/components/analytics/DefaultHeatmap";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";

import PageLayout from "@/components/PageLayout";

const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [topCircles, setTopCircles] = useState<any[]>([]);
  
  // Default to last 30 days if no dates are set
  const startDate = searchParams.get('startDate') || format(subMonths(new Date(), 1), 'yyyy-MM-dd');
  const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
  const frequency = searchParams.get('frequency') || 'all';
  const userTier = searchParams.get('userTier') || 'all';

  useEffect(() => {
    // Track analytics view event
    trackEvent('analytics_viewed', { 
      startDate, 
      endDate, 
      frequency, 
      userTier,
      page 
    });
    
    // Load data
    loadData();
    
    // Set up realtime subscription for data updates
    const channel = supabase
      .channel('analytics_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'circles' }, () => {
        loadData(); // Reload data when new circles are created
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'circle_transactions' }, () => {
        loadData(); // Reload data when transactions are updated
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate, frequency, userTier, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch top 10 circles by member count
      const { data, error } = await supabase
        .rpc('get_top_circles', { 
          p_start_date: startDate,
          p_end_date: endDate,
          p_frequency: frequency === 'all' ? null : frequency,
          p_page: page,
          p_page_size: 10
        });
        
      if (error) throw error;
      
      setTopCircles(data || []);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    // Update URL params
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    setSearchParams(params);
    
    // Reset page when filters change
    if (key !== 'page') {
      setPage(1);
    }
    
    // Track filter change event
    trackEvent('filter_changed', { 
      filter_name: key, 
      filter_value: value 
    });
  };

  return (
    <PageLayout>
      <section className="analytics-dashboard">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track performance metrics and user engagement</p>
          </div>
          <AnalyticsFilters 
            startDate={startDate}
            endDate={endDate}
            frequency={frequency}
            userTier={userTier}
            onFilterChange={handleFilterChange}
          />
        </header>

        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}>
          <ChartKpiCards 
            startDate={startDate} 
            endDate={endDate} 
            frequency={frequency} 
            userTier={userTier} 
          />
        </Suspense>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Suspense fallback={<Skeleton className="h-[350px]" />}>
            <Card>
              <CardHeader>
                <CardTitle>Circle Activity Over Time</CardTitle>
                <CardDescription>Active vs. Completed Circles</CardDescription>
              </CardHeader>
              <CardContent>
                <CircleActivityChart 
                  startDate={startDate} 
                  endDate={endDate} 
                  frequency={frequency} 
                />
              </CardContent>
            </Card>
          </Suspense>

          <Suspense fallback={<Skeleton className="h-[350px]" />}>
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Monthly Active Users vs. New Sign-ups</CardDescription>
              </CardHeader>
              <CardContent>
                <UserEngagementGraph 
                  startDate={startDate} 
                  endDate={endDate} 
                />
              </CardContent>
            </Card>
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="h-[300px]" />}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Default Heatmap</CardTitle>
              <CardDescription>Days with high missed-payment rates</CardDescription>
            </CardHeader>
            <CardContent>
              <DefaultHeatmap 
                startDate={startDate} 
                endDate={endDate} 
                frequency={frequency} 
              />
            </CardContent>
          </Card>
        </Suspense>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top 10 Circles by Size</CardTitle>
            <CardDescription>Circle performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Circle Name</TableHead>
                    <TableHead className="text-right">Member Count</TableHead>
                    <TableHead className="text-right">Completion %</TableHead>
                    <TableHead className="text-right">Avg. Contribution</TableHead>
                    <TableHead className="text-right">Avg. Delay (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        {Array(5).fill(0).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : topCircles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No data available</TableCell>
                    </TableRow>
                  ) : (
                    topCircles.map((circle) => (
                      <TableRow key={circle.id}>
                        <TableCell className="font-medium">{circle.name}</TableCell>
                        <TableCell className="text-right">{circle.member_count}</TableCell>
                        <TableCell className="text-right">{circle.completion_rate}%</TableCell>
                        <TableCell className="text-right">${circle.avg_contribution}</TableCell>
                        <TableCell className="text-right">{circle.avg_delay}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive>{page}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (topCircles.length === 10) { // If we have full page, assume there's more
                          setPage(page + 1);
                        }
                      }}
                      className={topCircles.length < 10 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
};

export default Analytics;
