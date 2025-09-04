import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Flame,
  Crown,
  Star,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface LeaderboardUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rank: number;
}

interface SavingsLeaderboardUser extends LeaderboardUser {
  total_saved: number;
}

interface StreakLeaderboardUser extends LeaderboardUser {
  current_streak: number;
  longest_streak: number;
  tier: string;
}

interface PointsLeaderboardUser extends LeaderboardUser {
  points: number;
  tier: string;
  badge_count: number;
}

interface CompletionLeaderboardUser extends LeaderboardUser {
  circles_joined: number;
  circles_completed: number;
  completion_rate: number;
}

const Leaderboards: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('savings');
  const [timeframe, setTimeframe] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [savingsLeaderboard, setSavingsLeaderboard] = useState<SavingsLeaderboardUser[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<StreakLeaderboardUser[]>([]);
  const [pointsLeaderboard, setPointsLeaderboard] = useState<PointsLeaderboardUser[]>([]);
  const [completionLeaderboard, setCompletionLeaderboard] = useState<CompletionLeaderboardUser[]>([]);

  const fetchLeaderboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const [savingsData, streakData, pointsData, completionData] = await Promise.all([
        supabase.rpc('get_savings_leaderboard', { p_timeframe: timeframe, p_limit: 10 }),
        supabase.rpc('get_streak_leaderboard', { p_limit: 10 }),
        supabase.rpc('get_points_leaderboard', { p_limit: 10 }),
        supabase.rpc('get_circle_completion_leaderboard', { p_limit: 10 })
      ]);

      if (savingsData.error) throw savingsData.error;
      if (streakData.error) throw streakData.error;
      if (pointsData.error) throw pointsData.error;
      if (completionData.error) throw completionData.error;

      setSavingsLeaderboard(savingsData.data || []);
      setStreakLeaderboard(streakData.data || []);
      setPointsLeaderboard(pointsData.data || []);
      setCompletionLeaderboard(completionData.data || []);

    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      toast.error('Failed to load leaderboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [user, timeframe]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    trackEvent('leaderboard_tab_changed', { tab: value });
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    trackEvent('leaderboard_timeframe_changed', { timeframe: value });
  };

  const handleRefresh = () => {
    fetchLeaderboardData();
    trackEvent('leaderboard_refreshed');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return 'bg-amber-100 text-amber-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'diamond': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isCurrentUser = (userId: string) => user?.id === userId;

  const LeaderboardItem: React.FC<{ 
    user: LeaderboardUser; 
    children: React.ReactNode;
    highlight?: boolean;
  }> = ({ user, children, highlight = false }) => (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
      highlight ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
    }`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8">
          {getRankIcon(user.rank)}
        </div>
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>
            {user.display_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className={`font-medium ${highlight ? 'text-primary' : ''}`}>
            {user.display_name || 'Anonymous User'}
            {highlight && <span className="ml-2 text-xs text-primary">(You)</span>}
          </p>
        </div>
      </div>
      <div className="text-right">
        {children}
      </div>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
            Leaderboards
          </h2>
          <p className="text-muted-foreground">See how you rank among the community</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="savings" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Savings</span>
          </TabsTrigger>
          <TabsTrigger value="streaks" className="flex items-center">
            <Flame className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Streaks</span>
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center">
            <Star className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Points</span>
          </TabsTrigger>
          <TabsTrigger value="completion" className="flex items-center">
            <Target className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Goals</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="savings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Top Savers ({timeframe})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : savingsLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No savings data available for this timeframe.
                </p>
              ) : (
                <div className="space-y-2">
                  {savingsLeaderboard.map((user) => (
                    <LeaderboardItem
                      key={user.user_id}
                      user={user}
                      highlight={isCurrentUser(user.user_id)}
                    >
                      <div>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(user.total_saved)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Saved</p>
                      </div>
                    </LeaderboardItem>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-orange-600" />
                Payment Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : streakLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No active streaks found.
                </p>
              ) : (
                <div className="space-y-2">
                  {streakLeaderboard.map((user) => (
                    <LeaderboardItem
                      key={user.user_id}
                      user={user}
                      highlight={isCurrentUser(user.user_id)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-semibold text-orange-600 flex items-center">
                            <Flame className="h-4 w-4 mr-1" />
                            {user.current_streak}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Best: {user.longest_streak}
                          </p>
                        </div>
                        <Badge className={getTierColor(user.tier)} variant="secondary">
                          {user.tier}
                        </Badge>
                      </div>
                    </LeaderboardItem>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-purple-600" />
                Loyalty Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : pointsLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No points data available.
                </p>
              ) : (
                <div className="space-y-2">
                  {pointsLeaderboard.map((user) => (
                    <LeaderboardItem
                      key={user.user_id}
                      user={user}
                      highlight={isCurrentUser(user.user_id)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-semibold text-purple-600">
                            {user.points.toLocaleString()} pts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.badge_count} badges
                          </p>
                        </div>
                        <Badge className={getTierColor(user.tier)} variant="secondary">
                          {user.tier}
                        </Badge>
                      </div>
                    </LeaderboardItem>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Circle Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingSkeleton />
              ) : completionLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No completion data available.
                </p>
              ) : (
                <div className="space-y-2">
                  {completionLeaderboard.map((user) => (
                    <LeaderboardItem
                      key={user.user_id}
                      user={user}
                      highlight={isCurrentUser(user.user_id)}
                    >
                      <div>
                        <p className="font-semibold text-blue-600">
                          {user.completion_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.circles_completed}/{user.circles_joined} circles
                        </p>
                      </div>
                    </LeaderboardItem>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboards;
