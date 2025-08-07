
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost, PostLike } from '@/types/gamification';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export const useSocialFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First fetch all posts
      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (postsError) {
        console.error('Error fetching social posts:', postsError);
        setError('Failed to load social feed');
        return;
      }
      
      // Then fetch user profiles for each post
      const postsWithProfiles = await Promise.all(
        postsData.map(async (post) => {
          // Get user profile for this post
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', post.user_id)
            .single();
          
          return {
            ...post,
            user_profile: profileData || null
          };
        })
      );
      
      // Get like counts for each post
      const postsWithLikes = await Promise.all(
        postsWithProfiles.map(async (post) => {
          // Get total like count
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
            
          // Check if current user liked this post
          let likedByUser = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
              
            likedByUser = !!likeData;
          }
          
          return {
            ...post,
            likes_count: likesCount || 0,
            liked_by_user: likedByUser
          };
        })
      );
      
      setPosts(postsWithLikes);
      
    } catch (error) {
      console.error('Error in social feed:', error);
      setError('Something went wrong while loading the feed');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchPosts();
    } else {
      setPosts([]);
      setIsLoading(false);
    }
  }, [user, fetchPosts]);
  
  // Set up realtime subscription for new posts
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('social_posts_channel')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_posts'
        },
        (payload) => {
          // When a new post is created, refresh the feed
          fetchPosts();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPosts]);

  // Function to like a post
  const likePost = async (postId: string) => {
    if (!user) {
      toast.error('You must be logged in to like posts');
      return;
    }
    
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (existingLike) {
        // Unlike the post
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);
          
        setPosts(currentPosts => 
          currentPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: (post.likes_count || 0) - 1,
                  liked_by_user: false
                }
              : post
          )
        );
      } else {
        // Like the post
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
          
        setPosts(currentPosts => 
          currentPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  likes_count: (post.likes_count || 0) + 1,
                  liked_by_user: true
                }
              : post
          )
        );
        
        trackEvent('post_liked', { post_id: postId });
      }
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      toast.error('Failed to process your like');
    }
  };

  // Function to create a new post
  const createPost = async (content: string, postType: 'milestone' | 'kudos', targetUserId?: string, circleId?: string) => {
    if (!user) {
      toast.error('You must be logged in to create posts');
      return null;
    }
    
    try {
      const newPost = {
        user_id: user.id,
        post_type: postType,
        content,
        target_user_id: targetUserId,
        circle_id: circleId
      };
      
      const { data, error } = await supabase
        .from('social_posts')
        .insert(newPost)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast.success('Post created successfully!');
      
      // Fetch the user profile to add to the post
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      // Create the complete post object
      const completePost: SocialPost = {
        ...data,
        user_profile: profileData || null,
        likes_count: 0,
        liked_by_user: false
      };
      
      // Add to the posts array
      setPosts(currentPosts => [completePost, ...currentPosts]);
      
      trackEvent('feed_posted', { 
        post_type: postType,
        has_target: !!targetUserId,
        has_circle: !!circleId
      });
      
      return completePost;
      
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create your post');
      return null;
    }
  };

  return { 
    posts, 
    isLoading, 
    error, 
    refreshPosts: fetchPosts,
    likePost,
    createPost
  };
};
