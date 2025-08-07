
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
    
    console.log("Starting daily allocation engine...");
    
    // Get all users with active goals
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Get current date (for allocations)
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    
    let totalAllocations = 0;
    let successfulAllocations = 0;
    let failedAllocations = 0;
    
    // Process allocations for each user
    for (const user of users.users) {
      // Get active savings goals for user
      const { data: goals, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (goalsError || !goals || goals.length === 0) {
        console.log(`No active goals found for user ${user.id} or error: ${goalsError?.message}`);
        continue;
      }
      
      // Fetch user's checking account balance through Plaid/ACH integration
      // This is a mock implementation - in a real app, you would call your actual bank integration
      const accountBalance = await fetchUserBalance(user.id);
      
      if (!accountBalance || accountBalance.error) {
        console.error(`Failed to fetch account balance for user ${user.id}: ${accountBalance?.error || "Unknown error"}`);
        continue;
      }
      
      // Get user savings preferences
      const { data: preferences } = await supabase
        .from('savings_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Default preferences if none found
      const userPreferences = preferences || {
        max_monthly_limit: 100,
        transfer_frequency: 'monthly',
        vacation_mode: false
      };
      
      // Skip processing if user has vacation mode enabled
      if (userPreferences.vacation_mode) {
        console.log(`User ${user.id} has vacation mode enabled, skipping allocations`);
        continue;
      }
      
      console.log(`Processing ${goals.length} goals for user ${user.id} with account balance $${accountBalance.balance}`);
      
      // Process each goal
      for (const goal of goals) {
        totalAllocations++;
        
        try {
          // Calculate allocation based on goal and user preferences
          const allocation = calculateDailyAllocation(
            goal, 
            accountBalance.balance, 
            userPreferences, 
            today
          );
          
          // Skip if no allocation needed
          if (allocation.amount <= 0) {
            console.log(`Skipping allocation for goal ${goal.id} - no allocation needed today`);
            continue;
          }
          
          // Record the allocation in daily_allocations table
          const { error: upsertError } = await supabase
            .from('daily_allocations')
            .upsert({
              user_id: user.id,
              goal_id: goal.id,
              date: todayFormatted,
              suggested_amount: allocation.amount,
              suggested_percentage: allocation.percentage,
              status: 'pending',
              updated_at: new Date().toISOString()
            });
          
          if (upsertError) {
            throw new Error(`Failed to record allocation: ${upsertError.message}`);
          }
          
          // Check if there's already a transfer scheduled for today
          const { data: existingTransfers } = await supabase
            .from('automated_savings')
            .select('*')
            .eq('user_id', user.id)
            .eq('goal_id', goal.id)
            .eq('status', 'pending')
            .gte('scheduled_for', today.toISOString().split('T')[0] + 'T00:00:00.000Z')
            .lte('scheduled_for', today.toISOString().split('T')[0] + 'T23:59:59.999Z');
          
          // If no transfer exists for today, schedule one
          if (!existingTransfers || existingTransfers.length === 0) {
            const { error: transferError } = await supabase
              .from('automated_savings')
              .insert({
                user_id: user.id,
                goal_id: goal.id,
                amount: allocation.amount,
                scheduled_for: new Date().toISOString(),
                status: 'pending'
              });
            
            if (transferError) {
              throw new Error(`Failed to schedule transfer: ${transferError.message}`);
            }
          }
          
          // Update allocation status to processed
          await supabase
            .from('daily_allocations')
            .update({ status: 'processed' })
            .eq('user_id', user.id)
            .eq('goal_id', goal.id)
            .eq('date', todayFormatted);
          
          // Emit analytics event
          trackAllocationEvent(user.id, goal.id, allocation.amount, allocation.percentage);
          
          successfulAllocations++;
          console.log(`Allocation for user ${user.id}, goal ${goal.id} processed successfully`);
          
        } catch (error) {
          failedAllocations++;
          console.error(`Error processing allocation for user ${user.id}, goal ${goal.id}:`, error);
          
          // Mark allocation as failed
          await supabase
            .from('daily_allocations')
            .upsert({
              user_id: user.id,
              goal_id: goal.id,
              date: todayFormatted,
              suggested_amount: 0,
              suggested_percentage: 0,
              status: 'failed',
              updated_at: new Date().toISOString()
            });
        }
      }
    }
    
    console.log(`Daily allocation completed: ${successfulAllocations} successful, ${failedAllocations} failed out of ${totalAllocations} total`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        message: "Daily allocation processing completed",
        stats: {
          total: totalAllocations,
          successful: successfulAllocations,
          failed: failedAllocations
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in daily allocation engine:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to fetch user's bank balance using Plaid
async function fetchUserBalance(userId: string) {
  try {
    // Get user's linked bank accounts
    const { data: linkedAccounts, error: accountsError } = await supabase
      .from('linked_bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (accountsError || !linkedAccounts || linkedAccounts.length === 0) {
      console.log(`No linked bank accounts found for user ${userId}`);
      return {
        balance: 0,
        user_id: userId,
        account_id: null,
        timestamp: new Date().toISOString()
      };
    }

    const account = linkedAccounts[0];
    
    // Initialize Plaid client
    const configuration = new Configuration({
      basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID')!,
          'PLAID-SECRET': Deno.env.get('PLAID_SECRET')!,
        },
      },
    });
    const plaidClient = new PlaidApi(configuration);

    // Get account balance from Plaid
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: account.plaid_access_token,
    });

    const plaidAccount = balanceResponse.data.accounts.find(acc => acc.account_id === account.account_id);
    if (!plaidAccount) {
      console.error(`Account ${account.account_id} not found in Plaid response`);
      return {
        balance: 0,
        user_id: userId,
        account_id: account.account_id,
        timestamp: new Date().toISOString()
      };
    }

    const availableBalance = plaidAccount.balances.available || plaidAccount.balances.current || 0;
    
    return {
      balance: availableBalance,
      user_id: userId,
      account_id: account.account_id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching user balance from Plaid:", error);
    return { error: "Failed to fetch account balance from Plaid" };
  }
}

// Calculate the daily allocation for a goal based on various factors
function calculateDailyAllocation(
  goal: any, 
  accountBalance: number, 
  preferences: any, 
  today: Date
) {
  // Default amounts if calculation fails
  let amount = 0;
  let percentage = 0;
  
  try {
    // Calculate amount remaining to reach goal
    const remainingAmount = goal.target_amount - goal.current_amount;
    
    // If goal is already met or no target date, use default allocation based on preferences
    if (remainingAmount <= 0 || !goal.target_date) {
      // Use allocation value from goal settings
      if (goal.allocation_type === 'percentage') {
        percentage = goal.allocation_value;
        amount = (accountBalance * percentage) / 100;
      } else {
        amount = goal.allocation_value;
        percentage = (amount / accountBalance) * 100;
      }
    } else {
      // Calculate based on days remaining
      const targetDate = new Date(goal.target_date);
      const daysRemaining = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate suggested daily amount
      const suggestedDaily = remainingAmount / daysRemaining;
      
      // Calculate percentage of account balance
      percentage = (suggestedDaily / accountBalance) * 100;
      
      // Cap percentage at a reasonable level (e.g., 15%)
      percentage = Math.min(15, percentage);
      
      // Calculate amount based on percentage
      amount = (accountBalance * percentage) / 100;
      
      // Ensure amount is not too small
      amount = Math.max(1, amount);
    }
    
    // Cap allocation based on user preferences and minimum transfer amount
    const maxDailyAmount = preferences.max_monthly_limit / 30;
    amount = Math.min(amount, maxDailyAmount);
    
    // Round to two decimal places
    amount = parseFloat(amount.toFixed(2));
    percentage = parseFloat(percentage.toFixed(2));
    
    return { amount, percentage };
  } catch (error) {
    console.error("Error calculating allocation:", error);
    return { amount: 0, percentage: 0 };
  }
}

// Track analytics for the allocation calculation
function trackAllocationEvent(
  userId: string, 
  goalId: string, 
  amount: number, 
  percentage: number
) {
  try {
    // Log analytics event (in a real app, this would call your analytics service)
    console.log(`[Analytics] Event: daily_allocation_calculated`, {
      user_id: userId,
      goal_id: goalId,
      suggested_amount: amount,
      suggested_percentage: percentage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error tracking analytics event:", error);
  }
}
