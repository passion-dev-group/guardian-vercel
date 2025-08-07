
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Member } from "@/types/circle";
import { toast } from "sonner";

export const useMembersList = (circleId: string | undefined) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!circleId) {
      setLoading(false);
      return;
    }
    
    const fetchMembers = async () => {
      setLoading(true);
      
      try {
        console.log("Fetching members for circle:", circleId);
        
        // Get circle members without using a direct relationship to profiles
        const { data: circleMembers, error: membersError } = await supabase
          .from('circle_members')
          .select(`
            id, user_id, payout_position, next_payout_date, is_admin
          `)
          .eq('circle_id', circleId)
          .order('payout_position', { ascending: true, nullsFirst: true });
          
        if (membersError) {
          toast.error("Failed to load circle members");
          throw membersError;
        }
        
        console.log("Number of members found:", circleMembers?.length || 0);
        
        if (circleMembers && circleMembers.length > 0) {
          // Fetch profiles for each member separately
          const enrichedMembers = await Promise.all(circleMembers.map(async (member) => {
            // Get profile data for this member
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', member.user_id)
              .maybeSingle();
              
            if (profileError) {
              console.error("Error fetching profile data:", profileError);
              // Continue with default profile data
            }
            
            // Get the latest contribution status for this member
            const { data: transactions, error: txError } = await supabase
              .from('circle_transactions')
              .select('transaction_date, status')
              .eq('circle_id', circleId)
              .eq('user_id', member.user_id)
              .eq('type', 'contribution')
              .order('transaction_date', { ascending: false })
              .limit(1);
            
            if (txError) {
              console.error("Error fetching transaction data:", txError);
            }
            
            let contributionStatus: "paid" | "due" | "overdue" = "due";
            
            if (transactions && transactions.length > 0) {
              const lastContribution = transactions[0];
              const lastContributionDate = new Date(lastContribution.transaction_date);
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              
              if (lastContribution.status === "completed") {
                contributionStatus = lastContributionDate > oneMonthAgo ? "paid" : "due";
              } else {
                contributionStatus = "overdue";
              }
            }
            
            // Create profile data structure with fallbacks
            const profile = profileData || { display_name: "Anonymous User", avatar_url: null };
            
            return {
              id: member.id,
              user_id: member.user_id,
              payout_position: member.payout_position,
              next_payout_date: member.next_payout_date,
              profile: {
                display_name: profile.display_name || "Anonymous User",
                avatar_url: profile.avatar_url
              },
              contribution_status: contributionStatus
            } as Member;
          }));
          
          console.log("Processed members data:", enrichedMembers);
          setMembers(enrichedMembers.filter(Boolean) as Member[]);
        } else {
          console.log("No members found or empty data returned");
          console.log("circleMembers value:", circleMembers);
          console.log("circleMembers type:", typeof circleMembers);
          setMembers([]);
        }
      } catch (error) {
        console.error("Error in useMembersList hook:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMembers();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('circle_members_changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'circle_members',
          filter: `circle_id=eq.${circleId}`
        },
        (payload) => {
          console.log("Realtime update received:", payload);
          fetchMembers();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId]);
  
  return { members, loading };
};
