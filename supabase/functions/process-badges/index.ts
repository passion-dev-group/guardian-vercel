
// This function is used to process badge awards and streak updates
// It can be called manually or via webhook
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Define the event types this function handles
interface BadgeEvent {
  type: 'streak_update' | 'circle_completed' | 'first_circle';
  user_id: string;
  streak_count?: number;
  circle_id?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the request body
    const { type, user_id, streak_count, circle_id } = await req.json() as BadgeEvent;

    console.log(`Processing badge event: ${type} for user ${user_id}`);

    // Perform different actions based on event type
    switch (type) {
      case 'streak_update':
        if (streak_count !== undefined) {
          await updateUserStreak(supabase, user_id, streak_count);
        }
        break;
      case 'circle_completed':
        if (circle_id) {
          await handleCircleCompletion(supabase, user_id, circle_id);
        }
        break;
      case 'first_circle':
        if (circle_id) {
          await handleFirstCircle(supabase, user_id, circle_id);
        }
        break;
      default:
        throw new Error(`Unknown event type: ${type}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Badge event processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing badge event:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateUserStreak(supabase: any, userId: string, streakCount: number) {
  // Update user streak
  const { data: tierData, error: tierError } = await supabase
    .from('user_tiers')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .single();
    
  if (tierError) {
    console.error('Error fetching user tier data:', tierError);
    throw tierError;
  }
  
  // Update the streak and calculate the longest streak
  const longestStreak = Math.max(tierData.longest_streak || 0, streakCount);
  
  // Award streak badges if applicable
  if (streakCount >= 5 && tierData.current_streak < 5) {
    // Award "Streak Master" badge
    await awardBadge(supabase, userId, 'Streak Master');
  }
  
  if (streakCount >= 10 && tierData.current_streak < 10) {
    // Award "Perfect Attendance" badge
    await awardBadge(supabase, userId, 'Perfect Attendance');
  }
  
  // Update the user tier
  const { error: updateError } = await supabase
    .from('user_tiers')
    .update({
      current_streak: streakCount,
      longest_streak: longestStreak,
      // Add points for every 5 streak milestones
      points: supabase.rpc('calculate_points_for_streak', { 
        user_id: userId, 
        streak: streakCount 
      })
    })
    .eq('user_id', userId);
    
  if (updateError) {
    console.error('Error updating user tier:', updateError);
    throw updateError;
  }
  
  console.log(`Updated streak for user ${userId} to ${streakCount}`);
}

async function handleCircleCompletion(supabase: any, userId: string, circleId: string) {
  // Award "Circle Master" badge
  await awardBadge(supabase, userId, 'Circle Master');
  
  // Add points
  const { error: updateError } = await supabase
    .from('user_tiers')
    .update({
      points: supabase.rpc('add_points', { 
        user_id: userId, 
        points_to_add: 50
      })
    })
    .eq('user_id', userId);
    
  if (updateError) {
    console.error('Error updating user points:', updateError);
    throw updateError;
  }
  
  // Create a social post
  const { data: circleData, error: circleError } = await supabase
    .from('circles')
    .select('name')
    .eq('id', circleId)
    .single();
    
  if (circleError) {
    console.error('Error fetching circle data:', circleError);
    throw circleError;
  }
  
  // Create social post
  const { error: postError } = await supabase
    .from('social_posts')
    .insert({
      user_id: userId,
      post_type: 'milestone',
      content: `I've successfully completed the "${circleData.name}" savings circle! 🎊`,
      circle_id: circleId
    });
    
  if (postError) {
    console.error('Error creating social post:', postError);
    throw postError;
  }
  
  console.log(`Handled circle completion for user ${userId} and circle ${circleId}`);
}

async function handleFirstCircle(supabase: any, userId: string, circleId: string) {
  // Award "First Circle" badge
  await awardBadge(supabase, userId, 'First Circle');
  
  // Add points
  const { error: updateError } = await supabase
    .from('user_tiers')
    .update({
      points: supabase.rpc('add_points', { 
        user_id: userId, 
        points_to_add: 10
      })
    })
    .eq('user_id', userId);
    
  if (updateError) {
    console.error('Error updating user points:', updateError);
    throw updateError;
  }
  
  // Create a social post
  const { data: circleData, error: circleError } = await supabase
    .from('circles')
    .select('name')
    .eq('id', circleId)
    .single();
    
  if (circleError) {
    console.error('Error fetching circle data:', circleError);
    throw circleError;
  }
  
  // Create social post
  const { error: postError } = await supabase
    .from('social_posts')
    .insert({
      user_id: userId,
      post_type: 'milestone',
      content: `I created my first savings circle called "${circleData.name}"! 🎉`,
      circle_id: circleId
    });
    
  if (postError) {
    console.error('Error creating social post:', postError);
    throw postError;
  }
  
  console.log(`Handled first circle for user ${userId} and circle ${circleId}`);
}

async function awardBadge(supabase: any, userId: string, badgeName: string) {
  // Get badge id
  const { data: badgeData, error: badgeError } = await supabase
    .from('badges')
    .select('id')
    .eq('name', badgeName)
    .single();
    
  if (badgeError) {
    console.error(`Error fetching badge ${badgeName}:`, badgeError);
    throw badgeError;
  }
  
  // Check if user already has this badge
  const { data: existingBadge, error: existingError } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeData.id)
    .maybeSingle();
    
  if (existingError) {
    console.error('Error checking existing badge:', existingError);
    throw existingError;
  }
  
  // If user doesn't have the badge, award it
  if (!existingBadge) {
    const { error: awardError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeData.id
      });
      
    if (awardError) {
      console.error('Error awarding badge:', awardError);
      throw awardError;
    }
    
    // Create a social post for the badge
    const { error: postError } = await supabase
      .from('social_posts')
      .insert({
        user_id: userId,
        post_type: 'badge',
        content: `I earned the "${badgeName}" badge! 🏆`,
        badge_id: badgeData.id
      });
      
    if (postError) {
      console.error('Error creating badge social post:', postError);
      throw postError;
    }
    
    console.log(`Awarded ${badgeName} badge to user ${userId}`);
  } else {
    console.log(`User ${userId} already has ${badgeName} badge`);
  }
}
