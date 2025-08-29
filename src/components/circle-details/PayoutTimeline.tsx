import { useState, useEffect } from "react";
import { Clock, User, Calendar, Trophy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";

interface PayoutTimelineMember {
  id: string;
  user_id: string;
  payout_position: number | null;
  next_payout_date: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  contribution_date: string | null;
}

interface PayoutTimelineProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  frequency: string;
}

const PayoutTimeline = ({ 
  circleId, 
  circleName, 
  contributionAmount, 
  frequency 
}: PayoutTimelineProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<PayoutTimelineMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleId || !user) return;

    const fetchPayoutTimeline = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get all circle members with their payout positions
        const { data: membersData, error: membersError } = await supabase
          .from('circle_members')
          .select(`
            id,
            user_id,
            payout_position,
            next_payout_date,
            is_admin
          `)
          .eq('circle_id', circleId)
          .order('payout_position', { ascending: true });

        if (membersError) {
          throw membersError;
        }

        // Get first contribution date for each member
        const { data: contributions, error: contributionsError } = await supabase
          .from('circle_transactions')
          .select('user_id, transaction_date')
          .eq('circle_id', circleId)
          .eq('type', 'contribution')
          .eq('status', 'completed')
          .order('transaction_date', { ascending: true });

        if (contributionsError) {
          throw contributionsError;
        }

        // Create map of first contribution dates
        const contributionDates = new Map<string, string>();
        contributions?.forEach(contrib => {
          if (!contributionDates.has(contrib.user_id)) {
            contributionDates.set(contrib.user_id, contrib.transaction_date);
          }
        });

        // Fetch profiles for all members
        const userIds = membersData?.map(member => member.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Continue without profile data
        }

        // Create map of profiles by user_id
        const profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          });
        });

        // Combine member data with contribution dates and profiles
        const timelineMembers: PayoutTimelineMember[] = membersData?.map(member => {
          const profile = profilesMap.get(member.user_id);
          
          return {
            id: member.id,
            user_id: member.user_id,
            payout_position: member.payout_position,
            next_payout_date: member.next_payout_date,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            is_admin: member.is_admin,
            contribution_date: contributionDates.get(member.user_id) || null,
          };
        }) || [];

        setMembers(timelineMembers);

      } catch (error) {
        console.error('Error fetching payout timeline:', error);
        setError(error instanceof Error ? error.message : 'Failed to load timeline');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayoutTimeline();

    // Set up real-time subscription for member changes
    const subscription = supabase
      .channel(`circle-${circleId}-timeline`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'circle_members',
        filter: `circle_id=eq.${circleId}`,
      }, () => {
        fetchPayoutTimeline();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [circleId, user]);

  const getFrequencyDays = (freq: string): number => {
    switch (freq) {
      case 'weekly': return 7;
      case 'biweekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'annual': return 365;
      default: return 30;
    }
  };

  const calculatePayoutDate = (position: number): Date => {
    const now = new Date();
    const daysPerPayout = getFrequencyDays(frequency);
    const daysUntilPayout = (position - 1) * daysPerPayout;
    
    const payoutDate = new Date(now);
    payoutDate.setDate(now.getDate() + daysUntilPayout);
    return payoutDate;
  };

  const getPositionBadgeVariant = (position: number | null, userId: string) => {
    if (position === 1) return "default";
    if (userId === user?.id) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payout Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Timeline Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMembers = members.filter(m => m.payout_position).sort((a, b) => 
    (a.payout_position || 0) - (b.payout_position || 0)
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle className="text-lg">Payout Timeline</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {frequency} payouts
          </Badge>
        </div>
        <CardDescription>
          Order determined by contribution time • ${contributionAmount.toLocaleString()} per payout
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sortedMembers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Payout order will be set when circle starts</p>
          </div>
        ) : (
          sortedMembers.map((member, index) => {
            const isCurrentUser = member.user_id === user?.id;
            const isNext = member.payout_position === 1;
            const estimatedDate = calculatePayoutDate(member.payout_position || 1);
            
            return (
              <div
                key={member.id}
                className={`flex items-center space-x-4 p-3 rounded-lg border transition-colors ${
                  isCurrentUser ? 'bg-blue-50 border-blue-200' : 
                  isNext ? 'bg-green-50 border-green-200' : 
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {member.is_admin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Trophy className="h-2.5 w-2.5 text-yellow-800" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {member.display_name || 'Unknown User'}
                        {isCurrentUser && <span className="text-blue-600 ml-1">(You)</span>}
                      </p>
                      {isNext && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Next
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {member.contribution_date && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Contributed {formatDistanceToNow(new Date(member.contribution_date))} ago
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {isNext ? 'Payout due' : 'Est.'} {format(estimatedDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Badge 
                  variant={getPositionBadgeVariant(member.payout_position, member.user_id)}
                  className="text-xs font-mono"
                >
                  #{member.payout_position}
                </Badge>
              </div>
            );
          })
        )}
        
        {sortedMembers.length > 0 && (
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Total circle pool: ${(contributionAmount * sortedMembers.length).toLocaleString()}</span>
              <span>Estimated completion: {format(calculatePayoutDate(sortedMembers.length + 1), 'MMM yyyy')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutTimeline;
