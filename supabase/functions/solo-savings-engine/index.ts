
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Starting solo savings engine...");
    
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Process a specific goal if provided or all goals
    if (path === 'process-goal') {
      const { goalId } = await req.json();
      
      if (!goalId) {
        return new Response(
          JSON.stringify({ error: "Goal ID is required" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      const result = await processSingleGoal(supabase, goalId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Default: process all goals
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Get all active solo goals with daily transfers enabled
      const { data: goals, error: goalsError } = await supabase
        .from('solo_savings_goals')
        .select('*')
        .eq('daily_transfer_enabled', true)
        .gt('target_amount', 'current_amount')
        .is('target_date', 'not.null');
      
      if (goalsError) {
        console.error("Error fetching solo goals:", goalsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch solo goals" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log(`Processing ${goals?.length || 0} active solo goals with daily transfers enabled`);
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each goal
      for (const goal of goals || []) {
        try {
          // Check if allocation for today already exists
          const { data: existingAllocation } = await supabase
            .from('solo_daily_allocations')
            .select('*')
            .eq('goal_id', goal.id)
            .eq('date', todayFormatted)
            .maybeSingle();
          
          if (existingAllocation) {
            console.log(`Allocation for goal ${goal.id} already exists for today`);
            continue;
          }
          
          // Calculate daily allocation amount
          const result = await processSingleGoal(supabase, goal.id);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error(`Error processing goal ${goal.id}:`, error);
          failureCount++;
        }
      }
      
      return new Response(
        JSON.stringify({
          message: `Processed ${successCount + failureCount} goals`,
          success: successCount,
          failure: failureCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error in solo savings engine:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processSingleGoal(supabase: any, goalId: string) {
  try {
    // Get goal details
    const { data: goal, error: goalError } = await supabase
      .from('solo_savings_goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError) {
      console.error(`Error fetching goal ${goalId}:`, goalError);
      return { success: false, error: "Goal not found" };
    }
    
    // Skip if daily transfers disabled or goal is complete
    if (!goal.daily_transfer_enabled || goal.current_amount >= goal.target_amount) {
      return { 
        success: false, 
        message: `Skipping goal ${goalId}: ${!goal.daily_transfer_enabled ? 'transfers disabled' : 'goal complete'}` 
      };
    }
    
    // Skip if no target date
    if (!goal.target_date) {
      return { success: false, message: `Skipping goal ${goalId}: no target date set` };
    }
    
    // Calculate days remaining until target date
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate amount remaining
    const amountRemaining = goal.target_amount - goal.current_amount;
    
    // Calculate suggested daily amount (divide remaining amount by days left)
    let suggestedAmount = amountRemaining / daysRemaining;
    
    // Round to 2 decimal places and ensure minimum of $1
    suggestedAmount = Math.max(1, Math.round(suggestedAmount * 100) / 100);
    
    // Get user's savings preferences for maximum limit
    const { data: preferences } = await supabase
      .from('savings_preferences')
      .select('*')
      .eq('user_id', goal.user_id)
      .maybeSingle();
    
    // Apply daily limit if preferences exist
    if (preferences) {
      const maxDailyLimit = preferences.max_monthly_limit / 30;
      suggestedAmount = Math.min(suggestedAmount, maxDailyLimit);
    }
    
    // Fetch user's mock account balance (in a real app, this would use Plaid/banking API)
    const accountBalance = 1000 + Math.random() * 4000; // Mock balance between $1000-$5000
    
    // Ensure suggested amount doesn't exceed 10% of account balance for safety
    suggestedAmount = Math.min(suggestedAmount, accountBalance * 0.1);
    
    // Format today's date
    const todayFormatted = today.toISOString().split('T')[0];
    
    // Create a daily allocation record
    const { data: allocation, error: allocationError } = await supabase
      .from('solo_daily_allocations')
      .insert({
        user_id: goal.user_id,
        goal_id: goal.id,
        date: todayFormatted,
        suggested_amount: suggestedAmount,
        status: 'pending'
      })
      .select()
      .single();
    
    if (allocationError) {
      console.error(`Error creating allocation for goal ${goalId}:`, allocationError);
      return { success: false, error: "Failed to create allocation" };
    }
    
    // Schedule the transfer by creating an automated savings entry
    const { data: transfer, error: transferError } = await supabase
      .from('solo_automated_savings')
      .insert({
        user_id: goal.user_id,
        goal_id: goal.id,
        amount: suggestedAmount,
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (transferError) {
      console.error(`Error scheduling transfer for goal ${goalId}:`, transferError);
      return { success: false, error: "Failed to schedule transfer" };
    }
    
    // Track the event
    console.log(`[Analytics] Event: daily_transfer_scheduled`, {
      user_id: goal.user_id,
      goal_id: goal.id,
      amount: suggestedAmount,
      days_remaining: daysRemaining
    });
    
    return { 
      success: true, 
      message: `Processed goal ${goalId}`, 
      allocation,
      transfer
    };
  } catch (error) {
    console.error(`Error processing goal ${goalId}:`, error);
    return { success: false, error: "Internal processing error" };
  }
}
