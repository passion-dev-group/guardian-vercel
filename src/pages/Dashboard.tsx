import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import CircleCard from "@/components/dashboard/CircleCard";
import QuickActionsBar from "@/components/dashboard/QuickActionsBar";
import UserPlanOverview from "@/components/pricing/UserPlanOverview";
import ContributionSummaryWidget from "@/components/dashboard/ContributionSummaryWidget";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import VerificationBanner from "@/components/VerificationBanner";
import { Circle } from "@/types/circle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextPayout, setNextPayout] = useState({
    date: null,
    amount: 0,
    circleId: null
  });

  const fetchUserCircles = async () => {
    if (!user) return;

    try {
      // Fetch circles with member counts in a single optimized query
      const { data, error } = await supabase
        .from("circle_members")
        .select(
          `
          circle_id,
          circles!inner (
            id,
            name,
            contribution_amount,
            frequency,
            status,
            created_at
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching circles:", error);
        return;
      }

      if (!data || data.length === 0) {
        setCircles([]);
        return;
      }

      // Extract unique circles and get their member counts
      const circleIds = [...new Set(data.map(member => member.circle_id))];
      
      // Fetch member counts for all circles in a single query
      const { data: memberCounts, error: countError } = await supabase
        .from('circle_members')
        .select('circle_id')
        .in('circle_id', circleIds);

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      // Count members per circle
      const memberCountMap = new Map<string, number>();
      memberCounts?.forEach(member => {
        const count = memberCountMap.get(member.circle_id) || 0;
        memberCountMap.set(member.circle_id, count + 1);
      });

      // Process circles with member counts
      const processedCircles: Circle[] = data
        .map(member => member.circles)
        .filter(Boolean)
        .map((circle: any) => ({
          id: circle.id,
          name: circle.name,
          contribution_amount: circle.contribution_amount,
          frequency: circle.frequency,
          status: circle.status,
          created_at: circle.created_at,
          created_by: '', // We need this to satisfy the type but don't have the data
          memberCount: memberCountMap.get(circle.id) || 0
        }));

      // Remove duplicates (in case user is in same circle multiple times)
      const uniqueCircles = processedCircles.filter((circle, index, self) => 
        index === self.findIndex(c => c.id === circle.id)
      );

      setCircles(uniqueCircles);

      // Calculate next payout from the first active circle
      const activeCircle = uniqueCircles.find(circle => circle.status === 'active');
      if (activeCircle) {
        // Calculate next payout date based on circle frequency
        const nextPayoutDate = new Date();
        if (activeCircle.frequency === 'weekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
        } else if (activeCircle.frequency === 'biweekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
        } else {
          nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
        }

        setNextPayout({
          date: nextPayoutDate,
          amount: activeCircle.contribution_amount || 0,
          circleId: activeCircle.id
        });
      }
    } catch (error) {
      console.error("Error in fetchUserCircles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCircles();
  }, [user]);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'circle_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("Dashboard transaction update:", payload);
          // Refresh circles data when transactions change
          fetchUserCircles();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_members',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("Dashboard membership update:", payload);
          // Refresh circles data when membership changes
          fetchUserCircles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <PageLayout>
      <div className="container max-w-7xl py-6">
        <VerificationBanner />

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="overview">Dashboard</TabsTrigger>
            <TabsTrigger value="plan">My Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Main dashboard content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-6">
                <QuickActionsBar />

                <h2 className="text-2xl font-bold">My Circles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoading ? (
                    // Loading state for circles
                    Array(4)
                      .fill(0)
                      .map((_, index) => (
                        <div
                          key={index}
                          className="h-48 bg-gray-100 rounded-lg animate-pulse"
                        />
                      ))
                  ) : circles.length > 0 ? (
                    // Display circles - now mapping over the flat array
                    circles.map((circle) => (
                      <CircleCard
                        key={circle.id}
                        id={circle.id}
                        name={circle.name}
                        contributionAmount={circle.contribution_amount}
                        frequency={circle.frequency}
                        memberCount={circle.memberCount || 0}
                        nextPayoutDate={null} // We don't have this info yet
                        isYourTurn={false} // We don't have this info yet
                      />
                    ))
                  ) : (
                    // No circles state
                    <div className="col-span-2 bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No savings circles yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Create or join a savings circle to get started
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center gap-2">
                        <Link
                          to="/create-circle"
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
                        >
                          Create a Circle
                        </Link>
                        <Link
                          to="/join-circle"
                          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Join a Circle
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <ContributionSummaryWidget />                
                
                <ActivityFeed />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Plan & Billing</h2>
              <UserPlanOverview
                currentPlan="monthly-pass"
                billingDate={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)}
                usageData={{
                  contributionsThisMonth: 8,
                  payoutsThisMonth: 2,
                  inviteCreditsUsed: 35,
                  inviteCreditsTotal: 100
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
