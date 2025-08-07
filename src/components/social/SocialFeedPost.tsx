
import React from 'react';
import { SocialPost } from '@/types/gamification';
import { formatDateRelative } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Award, Star, Circle, User } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface SocialFeedPostProps {
  post: SocialPost;
  onLike: (postId: string) => void;
}

export const SocialFeedPost: React.FC<SocialFeedPostProps> = ({ post, onLike }) => {
  // Helper to get post icon based on type
  const getPostIcon = () => {
    switch (post.post_type) {
      case 'milestone':
        return <Award className="h-4 w-4 mr-1 text-purple-500" />;
      case 'kudos':
        return <Star className="h-4 w-4 mr-1 text-amber-500" />;
      case 'badge':
        return <Award className="h-4 w-4 mr-1 text-green-500" />;
      case 'streak':
        return <Star className="h-4 w-4 mr-1 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 mr-1 text-blue-500" />;
    }
  };
  
  // Get display name or fallback
  const displayName = post.user_profile?.display_name || 'MiTurn User';
  
  // Get first letter for avatar fallback
  const avatarFallback = displayName.charAt(0).toUpperCase();
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <article>
          <header className="flex items-start mb-3">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage 
                src={post.user_profile?.avatar_url || ''} 
                alt={displayName} 
              />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center">
                <Link 
                  to={`/profile/${post.user_id}`} 
                  className="font-semibold text-sm hover:underline"
                >
                  {displayName}
                </Link>
                <span className="mx-2 text-gray-500">•</span>
                <time 
                  dateTime={post.created_at} 
                  className="text-xs text-gray-500"
                >
                  {formatDateRelative(new Date(post.created_at))}
                </time>
              </div>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                {getPostIcon()}
                <span>
                  {post.post_type === 'milestone' && 'Milestone'}
                  {post.post_type === 'kudos' && 'Gave kudos'}
                  {post.post_type === 'badge' && 'Earned badge'}
                  {post.post_type === 'streak' && 'Achievement'}
                </span>
              </div>
            </div>
          </header>
          
          <div className="mb-3 text-sm">
            <p>{post.content}</p>
          </div>
          
          {post.target_user_id && (
            <div className="flex items-center mb-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <User className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-xs text-gray-500">Mentioned another user</span>
            </div>
          )}
          
          {post.circle_id && (
            <div className="mb-3">
              <Link 
                to={`/circles/${post.circle_id}`} 
                className="text-xs text-blue-500 hover:underline flex items-center"
              >
                <Circle className="h-3 w-3 mr-1" />
                View Circle
              </Link>
            </div>
          )}
        </article>
      </CardContent>
      
      <CardFooter className="py-3 border-t">
        <div className="flex items-center space-x-4 w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center ${post.liked_by_user ? 'text-red-500' : ''}`}
            onClick={() => onLike(post.id)}
          >
            <Heart className={`h-4 w-4 mr-1 ${post.liked_by_user ? 'fill-red-500' : ''}`} />
            <span>{post.likes_count || 0}</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex items-center ml-auto" asChild>
            <Link to={`/feed?post=${post.id}`}>
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>Comment</span>
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
