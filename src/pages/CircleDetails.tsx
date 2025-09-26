import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import CircleHeader from "@/components/circle-details/CircleHeader";
import MemberList from "@/components/circle-details/MemberList";
import ContributionSchedule from "@/components/circle-details/ContributionSchedule";
import CircleActionsPanel from "@/components/circle-details/CircleActionsPanel";
import ActivityLog from "@/components/circle-details/ActivityLog";
import RealPaymentProcessor from "@/components/circle-details/RealPaymentProcessor";
import { PayoutCard } from "@/components/circle-details/PayoutCard";
import CircleStatsWidget from "@/components/circle-details/CircleStatsWidget";
import CircleAnalyticsWidget from "@/components/circle-details/CircleAnalyticsWidget";
import StartCircleButton from "@/components/circle-details/StartCircleButton";
import PayoutTimeline from "@/components/circle-details/PayoutTimeline";
import { RecurringTransferStatus } from "@/components/common/RecurringTransferStatus";

const CircleDetails = () => {
  const { circleId } = useParams<{ circleId: string }>();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const hasTrackedPageView = useRef(false);
  // Fetch circle details
  const { data: circle, isLoading: isCircleLoading, error: circleError } = useQuery({
    queryKey: ['circle', circleId],
    queryFn: async () => {
      if (!circleId) throw new Error("Circle ID is required");
      
      try {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('id', circleId)
          .maybeSingle();
          
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching circle:", error);
        throw error;
      }
    },
    enabled: !!circleId && !!user,
  });


  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !circleId) return;
      
      try {
        const { data, error } = await supabase
          .from('circle_members')
          .select('is_admin')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error when no data
          
        if (data && !error) {
          setIsAdmin(!!data.is_admin);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
      }
    };
    
    checkAdminStatus();
  }, [user, circleId]);
  
  // Track page view only once
  useEffect(() => {
    if (circle && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      
      trackEvent('circle_details_viewed', { 
        circle_id: circleId,
        circle_name: circle.name,
      });
    }
    
    // Cleanup function
    return () => {
      hasTrackedPageView.current = false;
    };
  }, [circle, circleId]);

  // console.log("CircleDetails rendering with circleId:", circleId);
  // console.log("Circle data:", circle);
  // console.log("Is admin:", isAdmin);
  
  if (isCircleLoading) {
    return <LoadingSpinner fullScreen size="large" />;
  }
  
  if (circleError || !circle) {
    console.error("Circle error:", circleError);
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-semibold mb-4">Circle Not Found</h1>
        <p className="mb-6">Sorry, we couldn't find the circle you're looking for.</p>
        <Link to="/dashboard">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="space-y-8">
        <CircleHeader circle={circle} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section aria-labelledby="members-heading">
              <h2 id="members-heading" className="text-xl font-semibold mb-4">Members</h2>
              <MemberList 
                circleId={circleId} 
                isAdmin={isAdmin} 
                currentUserId={user?.id}
              />
            </section>
            
            {/* <section aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="text-xl font-semibold mb-4">Payout Timeline</h2>
              <PayoutTimeline 
                circleId={circleId!}
                circleName={circle.name}
                contributionAmount={circle.contribution_amount}
                frequency={circle.frequency}
              />
            </section> */}

            <section aria-labelledby="activity-heading">
              <h2 id="activity-heading" className="text-xl font-semibold mb-4">Activity Log</h2>
              <ActivityLog circleId={circleId} />
            </section>
          </div>
          
          <div className="space-y-6">
            {isAdmin && (
              <section aria-labelledby="start-circle-heading">
                <h2 id="start-circle-heading" className="text-xl font-semibold mb-4">Circle Management</h2>
                <StartCircleButton 
                  circleId={circleId!}
                  circleName={circle.name}
                  isAdmin={isAdmin}
                />
              </section>
            )}
            
            {/* <section aria-labelledby="stats-heading">
              <h2 id="stats-heading" className="text-xl font-semibold mb-4">Circle Statistics</h2>
              <CircleStatsWidget circleId={circleId!} />
            </section>
            
            <section aria-labelledby="analytics-heading">
              <h2 id="analytics-heading" className="text-xl font-semibold mb-4">Circle Analytics</h2>
              <CircleAnalyticsWidget circleId={circleId!} />
            </section> */}
            
            {/* <section aria-labelledby="contribution-heading">
              <h2 id="contribution-heading" className="text-xl font-semibold mb-4">Real Payment Processing</h2>
              <RealPaymentProcessor 
                circleId={circleId!}
                circleName={circle.name}
                contributionAmount={circle.contribution_amount}
                isAdmin={isAdmin}
              />
            </section> */}
            
            {isAdmin && (
              <section aria-labelledby="payout-heading">
                <h2 id="payout-heading" className="text-xl font-semibold mb-4">Payout Management</h2>
                <PayoutCard 
                  circleId={circleId!}
                  circleName={circle.name}
                  isAdmin={isAdmin}
                />
              </section>
            )}
            

            
            <section aria-labelledby="schedule-heading">
              <h2 id="schedule-heading" className="text-xl font-semibold mb-4">Contribution Schedule</h2>
              <div className="space-y-4">
                <RecurringTransferStatus 
                  type="circle"
                  targetId={circleId!}
                  targetName={circle.name}
                />
                <ContributionSchedule circleId={circleId} />
              </div>
            </section>
            
            <section aria-labelledby="actions-heading">
              <h2 id="actions-heading" className="text-xl font-semibold mb-4">Actions</h2>
              <CircleActionsPanel 
                circleId={circleId} 
                isAdmin={isAdmin}
                circleName={circle.name}
                contributionAmount={circle.contribution_amount}
                frequency={circle.frequency}
                circleStatus={circle.status}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircleDetails;
