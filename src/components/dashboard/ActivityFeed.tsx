
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ActivityItem {
  id: string;
  type: "contribution" | "payout"; // Strict union type instead of string
  status: "pending" | "processing" | "completed" | "failed"; // Strict union type
  transaction_date: string;
  amount: number;
  description: string;
  circle_id: string;
  circle_name?: string;
}

// Helper to convert database response to ActivityItem
const convertToActivityItem = (item: any): ActivityItem => {
  return {
    id: item.id,
    type: item.type as "contribution" | "payout", // Type assertion
    status: item.status as "pending" | "processing" | "completed" | "failed", // Type assertion
    transaction_date: item.transaction_date,
    amount: item.amount,
    description: item.description,
    circle_id: item.circle_id,
    circle_name: item.circles?.name
  };
};

const ActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const limit = 10;

  useEffect(() => {
    console.log(user.id);
    if (!user?.id) return;
    
    const fetchInitialActivities = async () => {
      setIsLoading(true);
      
      try {
        // Fetch transactions with circle names
        const { data, error } = await supabase
          .from('circle_transactions')
          .select(`
            id, type, status, transaction_date, amount, description, circle_id, 
            circles(name)
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(limit);
          
        if (error) {
          console.error('Error fetching activity:', error);
          return;
        }
        
        // Convert response to ActivityItem
        const activitiesWithCircleName = data.map(convertToActivityItem);
        
        setActivities(activitiesWithCircleName);
        setHasMore(data.length === limit);
      } catch (error) {
        console.error('Error in activity fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the full data with joins for the new transaction
            const { data } = await supabase
              .from('circle_transactions')
              .select('id, type, status, transaction_date, amount, description, circle_id, circles(name)')
              .eq('id', payload.new.id)
              .single();
              
            if (data) {
              // Add circle name to the activity
              const newActivity = convertToActivityItem(data);
              
              // Update activities state with the new activity at the top
              setActivities(prev => [newActivity, ...prev]);
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  
  // Implement infinite scrolling
  useEffect(() => {
    if (!user || !hasMore || isLoading) return;
    
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoading(true);
          
          const { data, error } = await supabase
            .from('circle_transactions')
            .select(`
              id, type, status, transaction_date, amount, description, circle_id,
              circles(name)
            `)
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);
            
          if (error) {
            console.error('Error fetching more activities:', error);
            setIsLoading(false);
            return;
          }
          
          // Convert response to ActivityItem
          const newActivities = data.map(convertToActivityItem);
          
          if (newActivities.length > 0) {
            setActivities(prev => [...prev, ...newActivities]);
            setPage(prev => prev + 1);
          }
          
          setHasMore(data.length === limit);
          setIsLoading(false);
        }
      },
      { threshold: 1.0 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [user, page, hasMore, isLoading]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>;
      case 'pending':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full" aria-hidden="true"></span>;
      case 'failed':
        return <span className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>;
      default:
        return null;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    return `${type === 'payout' ? '+' : '-'}${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 && !isLoading ? (
          <p className="text-center py-4 text-gray-500">No activity yet</p>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                <div className="flex items-center">
                  <div className="mr-3">{getStatusIcon(activity.status)}</div>
                  <div>
                    <p className="text-sm font-medium">
                      {activity.type === 'contribution' ? 'Contribution to' : 'Payout from'} {activity.circle_name}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(activity.transaction_date)}</p>
                  </div>
                </div>
                <div className={`font-medium ${activity.type === 'payout' ? 'text-green-600' : ''}`}>
                  {formatAmount(activity.amount, activity.type)}
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {isLoading && (
          <div className="py-4 flex justify-center">
            <LoadingSpinner size="small" />
          </div>
        )}
        
        <div ref={observerTarget} className="h-1" />
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
