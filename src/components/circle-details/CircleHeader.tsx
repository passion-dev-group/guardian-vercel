import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import type { Database } from "@/types/supabase";

// Define interfaces based on the Database type
type Circle = Database['public']['Tables']['circles']['Row'];

interface CircleHeaderProps {
  circle: Circle;
}

const CircleHeader = ({ circle }: CircleHeaderProps) => {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [totalFunds, setTotalFunds] = useState<number>(0);
  
  useEffect(() => {
    // console.log("CircleHeader mounted with circle:", circle);
    
    const fetchMemberCount = async () => {
      try {
        const { count, error } = await supabase
          .from('circle_members')
          .select('*', { count: 'exact', head: true })
          .eq('circle_id', circle.id);
        
        if (!error && count !== null) {
          setMemberCount(count);
        }
      } catch (err) {
        console.error("Error fetching member count:", err);
        // Don't update state on error - keep default value
      }
    };
    
    const fetchTotalFunds = async () => {
      // Calculate total funds based on contributions minus payouts directly
      try {
        const { data: transactions, error } = await supabase
          .from('circle_transactions')
          .select('amount, type, status')
          .eq('circle_id', circle.id)
          .eq('status', 'completed');
          
        if (error) throw error;
            
        if (transactions) {
          const balance = transactions.reduce((acc, transaction) => {
            if (transaction.type === 'contribution') {
              return acc + transaction.amount;
            } else if (transaction.type === 'payout') {
              return acc - transaction.amount;
            }
            return acc;
          }, 0);
          
          setTotalFunds(balance);
        }
      } catch (error) {
        console.error("Error fetching total funds:", error);
        // Keep default value on error
      }
    };
    
    if (circle && circle.id) {
      fetchMemberCount();
      fetchTotalFunds();
    }
  }, [circle]);
  
  return (
    <header className="bg-background rounded-lg shadow-sm border">
      <div className="px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">{circle.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {`${circle.frequency} circle with ${formatCurrency(circle.contribution_amount)} contributions`}
        </p>
        <CircleAdminInfo circleId={circle.id} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t">
        <div className="px-4 py-5 sm:px-6">
          <dt className="text-sm font-medium text-muted-foreground">Members</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{memberCount}</dd>
        </div>
        
        <div className="px-4 py-5 sm:px-6 border-t sm:border-t-0 sm:border-l">
          <dt className="text-sm font-medium text-muted-foreground">Total Funds</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(totalFunds)}</dd>
        </div>
        
        <div className="px-4 py-5 sm:px-6 border-t sm:border-t-0 sm:border-l">
          <dt className="text-sm font-medium text-muted-foreground">Next Payout</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground" id="next-payout">
            <NextPayoutDate circleId={circle.id} />
          </dd>
        </div>
      </div>
    </header>
  );
};

// Helper component to display next payout date
const NextPayoutDate = ({ circleId }: { circleId: string }) => {
  const [nextPayout, setNextPayout] = useState<string>("Loading...");
  
  useEffect(() => {
    const fetchNextPayout = async () => {
      try {
        const { data, error } = await supabase
          .from('circle_members')
          .select('next_payout_date')
          .eq('circle_id', circleId)
          .not('next_payout_date', 'is', null)
          .order('next_payout_date', { ascending: true })
          .limit(1);
          
        if (!error && data && data.length > 0) {
          const payoutDate = new Date(data[0].next_payout_date as string);
          setNextPayout(new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }).format(payoutDate));
        } else {
          setNextPayout("Not scheduled");
        }
      } catch (error) {
        console.error("Error fetching payout date:", error);
        setNextPayout("Not available");
      }
    };
    
    fetchNextPayout();
  }, [circleId]);
  
  return <span>{nextPayout}</span>;
};

// Helper component to display circle admin information
const CircleAdminInfo = ({ circleId }: { circleId: string }) => {
  const [adminInfo, setAdminInfo] = useState<{ name: string; isCurrentUser: boolean } | null>(null);
  
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        // Get the admin member
        const { data: adminMember, error } = await supabase
          .from('circle_members')
          .select('user_id, is_admin')
          .eq('circle_id', circleId)
          .eq('is_admin', true)
          .maybeSingle();
          
        if (error) throw error;
        
        if (adminMember) {
          // Get the admin's profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', adminMember.user_id)
            .maybeSingle();
            
          if (profileError) throw profileError;
          
          // Check if current user is the admin
          const { data: { user } } = await supabase.auth.getUser();
          const isCurrentUser = user?.id === adminMember.user_id;
          
          setAdminInfo({
            name: profile?.display_name || "Unknown Admin",
            isCurrentUser
          });
        }
      } catch (error) {
        console.error("Error fetching admin info:", error);
      }
    };
    
    fetchAdminInfo();
  }, [circleId]);
  
  if (!adminInfo) return null;
  
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">👑 Admin:</span>
      <span className={`text-sm font-medium ${adminInfo.isCurrentUser ? 'text-blue-600' : 'text-foreground'}`}>
        {adminInfo.isCurrentUser ? 'You' : adminInfo.name}
      </span>
      {adminInfo.isCurrentUser && (
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          You
        </span>
      )}
    </div>
  );
};

export default CircleHeader;
