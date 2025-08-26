
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "contribution" | "payout";
  status: "pending" | "processing" | "completed" | "failed";
  transaction_date: string;
  amount: number;
  description: string | null;
  user_id: string;
  user_name?: string;
}

interface ActivityLogProps {
  circleId: string | undefined;
}

const ActivityLog = ({ circleId }: ActivityLogProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const loadActivities = async (loadMore = false) => {
    if (!circleId) return;
    
    setLoading(true);
    
    try {
      const from = loadMore ? page * limit : 0;
      const to = from + limit - 1;
      
      // Get transactions without joined profile data
      const { data: transactionData, error } = await supabase
        .from('circle_transactions')
        .select('*')
        .eq('circle_id', circleId)
        .order('transaction_date', { ascending: false })
        .range(from, to);
        
      if (error) throw error;
      
      // Now fetch profile data separately for each transaction
      const transactionsWithProfiles = await Promise.all(
        (transactionData || []).map(async (transaction) => {
          // Get user name from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', transaction.user_id)
            .maybeSingle();
          
          return {
            ...transaction,
            user_name: profileData?.display_name || "Anonymous User"
          } as ActivityItem;
        })
      );
      
      if (loadMore) {
        setActivities(prev => [...prev, ...transactionsWithProfiles]);
      } else {
        setActivities(transactionsWithProfiles);
      }
      
      setHasMore(transactionsWithProfiles.length === limit);
      if (loadMore) setPage(p => p + 1);
      else if (transactionsWithProfiles.length > 0) setPage(1);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadActivities();
  }, [circleId]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!circleId) return;
    
    const channel = supabase
      .channel('circle_transactions_changes')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_transactions',
          filter: `circle_id=eq.${circleId}`
        },
        async (payload) => {
          try {
            // Fetch the complete record with profile data
            const { data: transaction } = await supabase
              .from('circle_transactions')
              .select('*')
              .eq('id', payload.new.id)
              .single();
              
            if (transaction) {
              // Get profile data
              const { data: profileData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', transaction.user_id)
                .maybeSingle();
                
              // Add the new activity to the state
              const newActivity: ActivityItem = {
                ...transaction,
                user_name: profileData?.display_name || "Anonymous User"
              };
              
              setActivities(prev => [newActivity, ...prev]);
            }
          } catch (error) {
            console.error("Error processing real-time update:", error);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);
  
  const loadMore = () => {
    loadActivities(true);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading && !activities.length) {
    return <div className="text-center py-4">Loading activity...</div>;
  }
  
  if (!activities.length) {
    return <div className="text-center py-4">No activity found</div>;
  }
  
  return (
    <div className="rounded-md border overflow-hidden">
      <ul className="divide-y">
        {activities.map((activity) => (
          <li key={activity.id} className="p-4 bg-card hover:bg-accent/50 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {activity.type === "contribution" ? "Contribution" : "Payout"} - {formatCurrency(activity.amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.user_name}
                </p>
                {activity.description && (
                  <p className="text-sm mt-1">{activity.description}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(activity.status)}`}>
                  {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </span>
                <div className="flex items-center justify-end text-sm text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{formatDate(activity.transaction_date)}</span>
                </div>
                <div className="flex items-center justify-end text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{formatTime(activity.transaction_date)}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {hasMore && (
        <div className="p-4 flex justify-center border-t">
          <Button 
            variant="outline" 
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
