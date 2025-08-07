
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/PageLayout';
import GoalDetail from '@/components/savings/GoalDetail';
import { trackEvent } from '@/lib/analytics';

export default function GoalDetailsPage({ goalId: propGoalId }: { goalId?: string }) {
  // Get goalId from URL params if not provided as prop
  const params = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const goalId = propGoalId ?? params.goalId;
  const hasTrackedPageView = useRef(false);

  // Track page view only once when the component mounts
  useEffect(() => {
    if (!goalId || goalId === ':goalId') {
      navigate('/savings-goals');
      return;
    }

    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      trackEvent('circle_goal_details_viewed', { goal_id: goalId });
    }
    
    // Reset flag on unmount so tracking can occur again if remounted
    return () => {
      hasTrackedPageView.current = false;
    };
  }, [goalId, navigate]);

  if (!goalId || goalId === ':goalId') {
    return (
      <PageLayout>
        <p>Error: No valid goal ID provided.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <GoalDetail goalId={goalId} />
    </PageLayout>
  );
}
