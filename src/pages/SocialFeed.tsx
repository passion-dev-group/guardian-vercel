
import React, { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useUserTier } from '@/hooks/useUserTier';
import { useUserBadges } from '@/hooks/useUserBadges';
import { SocialFeedPost } from '@/components/social/SocialFeedPost';
import { CreatePostForm } from '@/components/social/CreatePostForm';
import Leaderboards from '@/components/social/Leaderboards';
import { TierBadge } from '@/components/gamification/TierBadge';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityIcon, UserIcon, Award, MessageSquare, RefreshCcw } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

const SocialFeed: React.FC = () => {
  const { user } = useAuth();
  const { posts, isLoading: postsLoading, error, refreshPosts, likePost, createPost } = useSocialFeed();
  const { userTier, isLoading: tierLoading } = useUserTier();
  const { badges, isLoading: badgesLoading } = useUserBadges();
  const [activeTab, setActiveTab] = useState('feed');
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    trackEvent('social_tab_changed', { tab: value });
  };
  
  const handleRefresh = () => {
    refreshPosts();
    trackEvent('feed_refreshed');
  };
  
  const handlePostCreated = async (content: string, postType: 'milestone' | 'kudos') => {
    const post = await createPost(content, postType);
    if (post) {
      trackEvent('post_created', { type: postType });
    }
    return post;
  };
  
  return (
    <PageLayout>
      <div className="container max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Social Feed</h1>
          <p className="text-muted-foreground">
            Connect with others on their financial goals and celebrate your milestones
          </p>
        </header>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="feed" className="flex items-center">
              <ActivityIcon className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center">
              <UserIcon className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <CreatePostForm onSubmit={handlePostCreated} />
                  </CardContent>
                </Card>
                
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Recent Posts
                  </h2>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="flex items-center"
                  >
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
                
                {postsLoading ? (
                  // Loading state
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="mb-4">
                      <CardContent className="pt-6">
                        <div className="flex items-start mb-3">
                          <Skeleton className="h-10 w-10 rounded-full mr-3" />
                          <div className="flex-1">
                            <Skeleton className="h-5 w-32 mb-2" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-16 w-full mb-3" />
                        <div className="flex justify-between">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : error ? (
                  // Error state
                  <Card className="p-6">
                    <p className="text-center text-red-500">{error}</p>
                    <Button 
                      onClick={handleRefresh}
                      className="mx-auto mt-4 flex items-center"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </Card>
                ) : posts.length === 0 ? (
                  // Empty state
                  <Card className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-1">No Posts Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to share a milestone or give kudos to someone!
                    </p>
                  </Card>
                ) : (
                  // Posts list
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <SocialFeedPost
                        key={post.id}
                        post={post}
                        onLike={likePost}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {user && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        Your Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {tierLoading ? (
                        <>
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-6 w-32" />
                        </>
                      ) : userTier && (
                        <>
                          <div className="flex justify-between items-center">
                            <span>Current Tier:</span>
                            <TierBadge tier={userTier.tier} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Payment Streak:</span>
                            <StreakCounter 
                              count={userTier.current_streak} 
                              longestStreak={userTier.longest_streak}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Total Points:</span>
                            <span className="font-semibold">{userTier.points}</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Award className="h-5 w-5 mr-2" />
                      Recent Badges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {badgesLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="aspect-square rounded-full" />
                        ))}
                      </div>
                    ) : badges.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No badges earned yet. Complete actions to earn badges!
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {badges.slice(0, 6).map((badge) => (
                          <div key={badge.id} className="flex justify-center">
                            <AchievementBadge badge={badge.badge!} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="leaderboards">
            <Leaderboards />
          </TabsContent>
          
          <TabsContent value="community">
            <Card className="p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Community Features Coming Soon</h3>
              <p className="text-muted-foreground">
                We're working on expanding our social features. Stay tuned for community profiles, friend connections, and more!
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SocialFeed;
