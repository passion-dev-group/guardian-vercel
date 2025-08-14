
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Configuration, PlaidApi, PlaidEnvironments } from 'https://esm.sh/plaid@18.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    if (path === 'analyze-spending') {
      // Get user ID from request body
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Get user's transactions to analyze spending patterns
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch transactions" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Calculate suggested transfer amount based on spending patterns
      const suggestedAmount = calculateSafeTransfer(transactions);

      return new Response(
        JSON.stringify({ suggestedAmount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (path === 'schedule-transfers') {
      // Schedule transfers for all active users with enabled goals
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error fetching users:", usersError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      const results = [];
      
      for (const user of users.users) {
        // Check if user has vacation mode enabled
        const { data: preferences, error: preferencesError } = await supabase
          .from('savings_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (preferencesError && preferencesError.code !== 'PGRST116') {
          console.error(`Error fetching preferences for user ${user.id}:`, preferencesError);
          continue;
        }
        
        // Skip if user has vacation mode enabled
        if (preferences && preferences.vacation_mode) {
          console.log(`User ${user.id} has vacation mode enabled, skipping`);
          continue;
        }
        
        // Get active goals for user
        const { data: goals, error: goalsError } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (goalsError) {
          console.error(`Error fetching goals for user ${user.id}:`, goalsError);
          continue;
        }
        
        if (!goals || goals.length === 0) {
          console.log(`No active goals for user ${user.id}`);
          continue;
        }
        
        // Get spending patterns to calculate safe transfer amount
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(50);
        
        if (transactionsError) {
          console.error(`Error fetching transactions for user ${user.id}:`, transactionsError);
          continue;
        }
        
        // Calculate total amount to transfer based on spending patterns and user preferences
        const totalAmount = calculateSafeTransfer(transactions);
        const maxMonthlyLimit = preferences?.max_monthly_limit || 100;
        
        // Limit total amount to user's maximum monthly limit
        const limitedAmount = Math.min(totalAmount, maxMonthlyLimit);
        
        // Calculate next transfer date based on user preferences
        const nextTransferDate = calculateNextTransferDate(preferences?.transfer_frequency || 'monthly', preferences?.next_transfer_date);
        
        // Schedule transfers for each goal
        for (const goal of goals) {
          let goalAmount;
          
          // Calculate amount based on allocation type
          if (goal.allocation_type === 'percentage') {
            // Convert percentage to decimal and multiply by limited amount
            goalAmount = (goal.allocation_value / 100) * limitedAmount;
          } else {
            // Fixed amount - respect the limit
            goalAmount = Math.min(goal.allocation_value, limitedAmount);
          }
          
          // Insert transfer record
          const { data: transfer, error: transferError } = await supabase
            .from('automated_savings')
            .insert({
              user_id: user.id,
              goal_id: goal.id,
              amount: goalAmount,
              scheduled_for: nextTransferDate,
              status: 'pending'
            })
            .select()
            .single();
          
          if (transferError) {
            console.error(`Error creating transfer for user ${user.id}, goal ${goal.id}:`, transferError);
            continue;
          }
          
          results.push({
            userId: user.id,
            goalId: goal.id,
            amount: goalAmount,
            scheduledFor: nextTransferDate
          });
        }
        
        // Update user's next transfer date
        if (preferences) {
          await supabase
            .from('savings_preferences')
            .update({ next_transfer_date: nextTransferDate, updated_at: new Date() })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('savings_preferences')
            .insert({ 
              user_id: user.id, 
              next_transfer_date: nextTransferDate, 
              transfer_frequency: 'monthly',
              max_monthly_limit: 100,
              vacation_mode: false
            });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          message: `Scheduled transfers for ${results.length} goals`,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (path === 'execute-transfers') {
      // Get pending transfers that are due
      const now = new Date();
      const { data: pendingTransfers, error: transfersError } = await supabase
        .from('automated_savings')
        .select('*, savings_goals!inner(*)')
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString());
      
      if (transfersError) {
        console.error("Error fetching pending transfers:", transfersError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch pending transfers" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      const results = [];
      
      for (const transfer of pendingTransfers || []) {
        try {
          // Get user's linked bank account for the transfer
          const { data: linkedAccount, error: accountError } = await supabase
            .from('linked_bank_accounts')
            .select('*')
            .eq('user_id', transfer.savings_goals.user_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (accountError || !linkedAccount) {
            console.error(`No linked bank account found for user ${transfer.savings_goals.user_id}`);
            // Mark as failed
            await supabase
              .from('automated_savings')
              .update({
                status: 'failed',
                executed_at: now.toISOString(),
                error_message: 'No linked bank account found'
              })
              .eq('id', transfer.id);
            
            results.push({
              transferId: transfer.id,
              status: 'failed',
              amount: transfer.amount,
              goalId: transfer.goal_id,
              error: 'No linked bank account found'
            });
            continue;
          }

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

          // Get user profile for transfer
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', transfer.savings_goals.user_id)
            .single();

          if (profileError || !userProfile) {
            console.error(`User profile not found for user ${transfer.savings_goals.user_id}`);
            await supabase
              .from('automated_savings')
              .update({
                status: 'failed',
                executed_at: now.toISOString(),
                error_message: 'User profile not found'
              })
              .eq('id', transfer.id);
            
            results.push({
              transferId: transfer.id,
              status: 'failed',
              amount: transfer.amount,
              goalId: transfer.goal_id,
              error: 'User profile not found'
            });
            continue;
          }

          // Create transfer authorization
          const authorizationRequest = {
            access_token: linkedAccount.plaid_access_token,
            account_id: linkedAccount.plaid_account_id,
            type: 'debit' as const,
            network: 'ach' as const,
            amount: transfer.amount.toString(),
            ach_class: 'ppd' as const,
            user: {
              legal_name: userProfile.display_name || 'Unknown User',
              phone_number: userProfile.phone || '+1234567890',
              email_address: userProfile.email || 'user@example.com',
              address: {
                street: userProfile.address?.street || '123 Main St',
                city: userProfile.address?.city || 'City',
                state: userProfile.address?.state || 'State',
                zip: userProfile.address?.zip || '12345',
                country: userProfile.address?.country || 'US',
              },
            },
            device: {
              user_agent: 'Savings Circle App/1.0',
              ip_address: '127.0.0.1',
            },
          };

          // Create authorization
          const authResponse = await plaidClient.transferAuthorizationCreate(authorizationRequest);
          const authorization = authResponse.data.authorization;

          if (authorization.decision !== 'approved') {
            console.error(`Transfer authorization denied for transfer ${transfer.id}:`, authorization.decision_rationale);
            await supabase
              .from('automated_savings')
              .update({
                status: 'failed',
                executed_at: now.toISOString(),
                error_message: `Transfer authorization denied: ${authorization.decision}`
              })
              .eq('id', transfer.id);
            
            results.push({
              transferId: transfer.id,
              status: 'failed',
              amount: transfer.amount,
              goalId: transfer.goal_id,
              error: `Transfer authorization denied: ${authorization.decision}`
            });
            continue;
          }

          // Create the actual transfer
          const transferRequest = {
            access_token: linkedAccount.plaid_access_token,
            account_id: linkedAccount.plaid_account_id,
            authorization_id: authorization.id,
            type: 'debit' as const,
            network: 'ach' as const,
            amount: transfer.amount.toString(),
            description: `Automated savings transfer to ${transfer.savings_goals.name}`,
            ach_class: 'ppd' as const,
            user: authorizationRequest.user,
            device: authorizationRequest.device,
          };

          const plaidTransferResponse = await plaidClient.transferCreate(transferRequest);
          const plaidTransfer = plaidTransferResponse.data.transfer;

          // Update transfer status to completed
          await supabase
            .from('automated_savings')
            .update({
              status: 'completed',
              executed_at: now.toISOString(),
              plaid_transfer_id: plaidTransfer.id,
              plaid_authorization_id: authorization.id
            })
            .eq('id', transfer.id);
          
          // Update goal current amount
          await supabase
            .from('savings_goals')
            .update({
              current_amount: transfer.savings_goals.current_amount + transfer.amount,
              updated_at: now.toISOString()
            })
            .eq('id', transfer.goal_id);
          
          results.push({
            transferId: transfer.id,
            status: 'completed',
            amount: transfer.amount,
            goalId: transfer.goal_id,
            plaid_transfer_id: plaidTransfer.id
          });

        } catch (error) {
          console.error(`Error processing transfer ${transfer.id}:`, error);
          
          // Mark as failed
          await supabase
            .from('automated_savings')
            .update({
              status: 'failed',
              executed_at: now.toISOString(),
              error_message: error.message || 'Transfer processing failed'
            })
            .eq('id', transfer.id);
          
          results.push({
            transferId: transfer.id,
            status: 'failed',
            amount: transfer.amount,
            goalId: transfer.goal_id,
            error: error.message || 'Transfer processing failed'
          });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          message: `Processed ${results.length} transfers`,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Default response for unknown paths
    return new Response(
      JSON.stringify({ error: "Unknown endpoint" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to calculate a safe transfer amount based on spending patterns
function calculateSafeTransfer(transactions: any[]): number {
  if (!transactions || transactions.length === 0) {
    return 10; // Default conservative amount if no transaction history
  }
  
  // Calculate average transaction amount
  const totalTransactions = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const avgTransaction = totalTransactions / transactions.length;
  
  // Calculate standard deviation to understand spending volatility
  const squareDiffs = transactions.map(tx => Math.pow(Number(tx.amount) - avgTransaction, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);
  
  // More conservative for volatile spending, more aggressive for stable spending
  const volatilityFactor = Math.min(1, 3 / (1 + stdDev / avgTransaction));
  
  // Base suggestion on 5-10% of average transaction, adjusted for volatility
  const basePercentage = 0.05 + (0.05 * volatilityFactor);
  let suggestedAmount = avgTransaction * basePercentage;
  
  // Round to nearest dollar and ensure minimum of $5, maximum of $100
  suggestedAmount = Math.round(Math.max(5, Math.min(100, suggestedAmount)));
  
  return suggestedAmount;
}

// Helper function to calculate the next transfer date based on frequency
function calculateNextTransferDate(frequency: string, lastTransferDate?: string | null): string {
  const now = new Date();
  let nextDate = new Date(now);
  
  // If last transfer date exists, calculate from that, otherwise from now
  if (lastTransferDate) {
    nextDate = new Date(lastTransferDate);
  }
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      // Default to monthly if unknown frequency
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate.toISOString();
}
