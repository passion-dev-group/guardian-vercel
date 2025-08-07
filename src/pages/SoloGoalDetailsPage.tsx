
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import SoloGoalDetail from '@/components/savings/SoloGoalDetail';
import { trackEvent } from '@/lib/analytics';

export default function SoloGoalDetailsPage({ goalId: propGoalId }: { goalId?: string }) {
  const params = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const goalId = propGoalId ?? params.goalId;
  const hasTrackedPageView = useRef(false);
  
  useEffect(() => {
    // Validate goalId and redirect if invalid
    if (!goalId || goalId === ':goalId') {
      console.error("Invalid goalId:", goalId);
      navigate('/savings-goals');
      return;
    }
    
    // Track page view only once when component mounts with valid goalId
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      
      trackEvent('savings_goal_details_viewed', {
        goal_id: goalId
      });
      
      console.log('[Analytics] Event: savings_goal_details_viewed', {
        goal_id: goalId
      });
    }
    
    // Reset tracking flag on unmount
    return () => {
      hasTrackedPageView.current = false;
    };
  }, [goalId, navigate]);

  // Early return if goalId is invalid
  if (!goalId || goalId === ':goalId') {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold">No valid goal ID provided</h1>
          <p className="mt-2 text-muted-foreground">Please select a goal from the savings goals page.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SoloGoalDetail goalId={goalId} />
    </PageLayout>
  );
}
