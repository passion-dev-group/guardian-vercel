import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Configuration, PlaidApi, PlaidEnvironments } from "https://esm.sh/plaid@18.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Plaid client for test clock checks in sandbox
function createPlaidClient() {
  const plaidClientId = Deno.env.get('PLAID_CLIENT_ID')!;
  const plaidSecret = Deno.env.get('PLAID_SECRET')!;
  const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';

  const configuration = new Configuration({
    basePath: plaidEnv === "sandbox" ? PlaidEnvironments.sandbox : PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret,
      },
    },
  });

  return new PlaidApi(configuration);
}

interface CircleWithEndedCycle {
  id: string;
  name: string;
  frequency: string;
  contribution_amount: number;
  status: string;
  member_id: string;
  user_id: string;
  payout_position: number;
  next_payout_date: string;
}

/**
 * Check for circles where the current cycle has ended
 * A cycle ends when next_payout_date has passed for the current payout member
 * In sandbox mode, uses test clock virtual time instead of actual time
 */
async function getCirclesWithEndedCycles(): Promise<CircleWithEndedCycle[]> {
  const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
  const isSandbox = plaidEnv === 'sandbox';
  
  // In production, use current time for comparison
  let today = new Date().toISOString();
  
  console.log(`Checking for circles with ended cycles (${isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode)`);
  console.log(`Current time: ${today}`);
  
  // Find circle members whose next_payout_date has passed and are in payout position 1
  const { data, error } = await supabase
    .from("circle_members")
    .select(`
      id,
      user_id,
      payout_position,
      next_payout_date,
      circle_id,
      circles (
        id,
        name,
        frequency,
        contribution_amount,
        status,
        test_clock_id
      )
    `)
    .eq("payout_position", 1)
    .not("next_payout_date", "is", null);

  if (error) {
    console.error("Error fetching circles with ended cycles:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("No circles with payout position 1 found");
    return [];
  }

  console.log(`Found ${data.length} circle(s) in payout position 1, checking cycle end status...`);

  // In sandbox mode, we need to check test clocks for each circle
  const circlesWithEndedCycles: CircleWithEndedCycle[] = [];
  
  for (const member of data) {
    const circle = Array.isArray(member.circles) ? member.circles[0] : member.circles;
    
    if (!circle) continue;
    
    let cycleHasEnded = false;
    let checkTimeUsed = today;
    
    if (isSandbox) {
      // Get test clock ID from circle data (stored when circle was started)
      const testClockId = (circle as any).test_clock_id;
      
      if (testClockId) {
        // Get test clock virtual time from Plaid
        try {
          const plaidClient = createPlaidClient();
          const clockResponse = await plaidClient.sandboxTransferTestClockGet({ 
            test_clock_id: testClockId 
          } as any);
          
          const virtualTime = clockResponse.data.test_clock.virtual_time;
          checkTimeUsed = virtualTime;
          cycleHasEnded = member.next_payout_date <= virtualTime;
          
          console.log(`Circle ${circle.name}: test_clock_id=${testClockId}, virtual_time=${virtualTime}, next_payout=${member.next_payout_date}, ended=${cycleHasEnded}`);
        } catch (clockError) {
          console.warn(`Failed to get test clock ${testClockId} for circle ${circle.id}:`, clockError);
          // Fall back to normal time comparison
          cycleHasEnded = member.next_payout_date <= today;
        }
      } else {
        // No test clock found, use normal time comparison
        console.log(`No test clock found for circle ${circle.name}, using current time`);
        cycleHasEnded = member.next_payout_date <= today;
      }
    } else {
      // Production mode: use actual current time
      cycleHasEnded = member.next_payout_date <= today;
      console.log(`Circle ${circle.name}: current_time=${today}, next_payout=${member.next_payout_date}, ended=${cycleHasEnded}`);
    }
    
    if (cycleHasEnded) {
      circlesWithEndedCycles.push({
        id: circle.id,
        name: circle.name,
        frequency: circle.frequency,
        contribution_amount: circle.contribution_amount,
        status: circle.status,
        member_id: member.id,
        user_id: member.user_id,
        payout_position: member.payout_position,
        next_payout_date: member.next_payout_date,
      });
    }
  }

  console.log(`Found ${circlesWithEndedCycles.length} circle(s) with ended cycles`);
  
  return circlesWithEndedCycles;
}

/**
 * Process payout for a circle member
 * This processes the payout by:
 * 1. Getting all contributions for the current cycle
 * 2. Moving funds from member ledgers to the current positioned member
 * 3. Advancing the rotation to the next member
 * 4. Marking the cycle as successfully processed
 */
async function processPayout(circle: CircleWithEndedCycle): Promise<boolean> {
  console.log(`Processing payout for circle: ${circle.name} (${circle.id})`);
  console.log(`Member to receive payout: ${circle.user_id}`);
  console.log(`Member ID: ${circle.member_id}`);
  
  try {
    // Step 1: Get all completed contributions for the current cycle
    const { data: contributions, error: contributionsError } = await supabase
      .from('circle_transactions')
      .select('amount, status, user_id, metadata')
      .eq('circle_id', circle.id)
      .eq('type', 'contribution')
      .eq('status', 'completed');
    
    if (contributionsError) {
      console.error('Error fetching contributions:', contributionsError);
      return false;
    }
    
    if (!contributions || contributions.length === 0) {
      console.log('No completed contributions found for this cycle');
      return false;
    }
    
    // Calculate total pool amount from completed contributions
    const totalPool = contributions.reduce((sum, tx) => sum + tx.amount, 0);
    
    console.log(`Total pool amount: $${totalPool} from ${contributions.length} contributions`);
    
    // Step 2: Get payout recipient's linked bank account
    const { data: recipientAccount, error: accountError } = await supabase
      .from('linked_bank_accounts')
      .select('*')
      .eq('user_id', circle.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (accountError || !recipientAccount) {
      console.error('Error fetching recipient bank account:', accountError);
      console.error('Payout recipient does not have a linked bank account');
      return false;
    }

    // Step 3: Get all contribution transfer IDs for ledger distribution
    const contributionTransferIds: string[] = [];
    for (const contribution of contributions) {
      if (contribution.metadata?.plaid_transfer_id || contribution.metadata?.transfer_id) {
        contributionTransferIds.push(contribution.metadata.plaid_transfer_id || contribution.metadata.transfer_id);
      }
    }

    if (contributionTransferIds.length === 0) {
      console.error('No Plaid transfer IDs found in contributions metadata');
      return false;
    }

    console.log(`Found ${contributionTransferIds.length} contribution transfer IDs for ledger distribution`);

    // Step 4: Use Plaid API to distribute funds from ledger
    const plaidClient = createPlaidClient();
    let ledgerDistributionSuccess = false;
    
    try {
      // Call Plaid's /transfer/ledger/distribute endpoint
      const distributeRequest = {
        from_transfer_ids: contributionTransferIds, // Source transfers (contributions)
        to_account_id: recipientAccount.plaid_account_id, // Recipient's bank account
        amount: totalPool.toFixed(2), // Total amount to distribute
        description: `Payout for ${circle.name} cycle ended ${circle.next_payout_date}`,
        idempotency_key: `payout-${circle.id}-${circle.next_payout_date}` // Prevent duplicate distributions
      };

      console.log('Calling Plaid /transfer/ledger/distribute:', distributeRequest);
      
      // Make the API call to distribute funds
      const distributeResponse = await plaidClient.transferLedgerDistribute(distributeRequest as any);
      
      console.log('✅ Plaid ledger distribution successful:', distributeResponse.data);

      // Create payout transaction record with Plaid distribution details
      const { data: payoutTransaction, error: payoutError } = await supabase
        .from('circle_transactions')
        .insert({
          circle_id: circle.id,
          user_id: circle.user_id,
          amount: totalPool,
          type: 'payout',
          status: 'completed',
          transaction_date: new Date().toISOString(),
          description: `Cycle payout received from ${circle.name}`,
          plaid_transfer_id: distributeResponse.data.transfer?.id || null,
          metadata: {
            transfer_type: 'ledger_distribute',
            cycle_ended: circle.next_payout_date,
            total_contributions: contributions.length,
            contribution_transfer_ids: contributionTransferIds,
            processed_by: 'do-daily-check',
            auto_processed: true,
            plaid_distribution_id: distributeResponse.data.distribution_id || null,
            plaid_response: distributeResponse.data
          }
        })
        .select()
        .single();
      
      if (payoutError) {
        console.error('Error creating payout transaction:', payoutError);
        return false;
      }
      
      console.log(`Created payout transaction: ${payoutTransaction.id} for $${totalPool}`);
      console.log(`Plaid ledger distribution completed successfully`);
      ledgerDistributionSuccess = true;
      
    } catch (plaidError: any) {
      console.error('❌ Plaid ledger distribution failed:', plaidError);
      console.error('Plaid error details:', plaidError?.response?.data || plaidError?.message);
      
      // Fallback: Create payout transaction as pending if Plaid fails
      const { data: payoutTransaction, error: payoutError } = await supabase
        .from('circle_transactions')
        .insert({
          circle_id: circle.id,
          user_id: circle.user_id,
          amount: totalPool,
          type: 'payout',
          status: 'pending', // Mark as pending since Plaid distribution failed
          transaction_date: new Date().toISOString(),
          description: `Cycle payout (pending) for ${circle.name}`,
          metadata: {
            transfer_type: 'ledger_distribute_failed',
            cycle_ended: circle.next_payout_date,
            total_contributions: contributions.length,
            contribution_transfer_ids: contributionTransferIds,
            processed_by: 'do-daily-check',
            auto_processed: true,
            plaid_error: plaidError?.response?.data || plaidError?.message
          }
        })
        .select()
        .single();
      
      if (payoutError) {
        console.error('Error creating pending payout transaction:', payoutError);
        return false;
      }
      
      console.log(`Created pending payout transaction: ${payoutTransaction.id}`);
      console.log('⚠️ Plaid distribution failed, payout marked as pending for manual review');
    }
    
    // Step 5: Get all members to advance the rotation
    const { data: allMembers, error: membersError } = await supabase
      .from('circle_members')
      .select('id, user_id, payout_position')
      .eq('circle_id', circle.id)
      .not('payout_position', 'is', null)
      .order('payout_position', { ascending: true });
    
    if (membersError || !allMembers || allMembers.length === 0) {
      console.error('Error fetching circle members:', membersError);
      return false;
    }
    
    const maxPosition = Math.max(...allMembers.map(m => m.payout_position || 0));
    
    console.log(`Advancing rotation. Total members: ${allMembers.length}, Max position: ${maxPosition}`);
    
    // Step 6: Advance the rotation - update all member positions
    // Current member (position 1) moves to the end
    // All other members move up one position
    for (const member of allMembers) {
      let newPayoutPosition = member.payout_position;
      let newNextPayoutDate: string | null = null;
      
      if (member.payout_position === 1) {
        // Current payout member gets moved to the end
        newPayoutPosition = maxPosition;
        newNextPayoutDate = null;
      } else {
        // All other members move up by 1
        newPayoutPosition = member.payout_position - 1;
        
        // If this member is now in position 1, calculate next payout date
        if (newPayoutPosition === 1) {
          const nextPayoutDate = new Date();
          if (circle.frequency === 'weekly') {
            nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
          } else if (circle.frequency === 'biweekly') {
            nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
          } else {
            nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
          }
          newNextPayoutDate = nextPayoutDate.toISOString();
        }
      }
      
      const { error: updateError } = await supabase
        .from('circle_members')
        .update({
          payout_position: newPayoutPosition,
          next_payout_date: newNextPayoutDate
        })
        .eq('id', member.id);
      
      if (updateError) {
        console.error(`Error updating member ${member.id} position:`, updateError);
        return false;
      }
      
      console.log(`Updated member ${member.user_id}: position ${member.payout_position} -> ${newPayoutPosition}`);
    }
    
    console.log(`✅ Successfully processed payout for circle: ${circle.name}`);
    console.log(`   Payout amount: $${totalPool}`);
    console.log(`   Recipient: ${circle.user_id}`);
    console.log(`   Plaid ledger distribution: ${ledgerDistributionSuccess ? 'SUCCESS' : 'PENDING'} (${contributionTransferIds.length} source transfers)`);
    console.log(`   Rotation advanced successfully`);
    
    return true;
    
  } catch (error) {
    console.error('Error processing payout:', error);
    return false;
  }
}

/**
 * Log the cycle check event for analytics
 */
async function logCycleCheck(circlesProcessed: number, successCount: number, failureCount: number) {
  try {
    await supabase.functions.invoke("track-analytics-event", {
      body: {
        event: "daily_cycle_check",
        user_id: "system",
        properties: {
          circles_processed: circlesProcessed,
          payouts_successful: successCount,
          payouts_failed: failureCount,
          check_date: new Date().toISOString(),
        }
      }
    });
  } catch (error) {
    console.error("Failed to log analytics event:", error);
    // Don't throw - analytics failure shouldn't block the function
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily circle cycle check...");
    
    // Step 1: Get circles with ended cycles
    const circlesWithEndedCycles = await getCirclesWithEndedCycles();
    
    if (circlesWithEndedCycles.length === 0) {
      console.log("No cycles to process today");
      
      await logCycleCheck(0, 0, 0);
      
      return new Response(JSON.stringify({
        success: true,
        message: "No cycles to process today",
        circles_checked: 0,
        payouts_processed: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Step 2: Process payouts for each circle with ended cycle
    const results = await Promise.allSettled(
      circlesWithEndedCycles.map(circle => processPayout(circle))
    );
    
    const successCount = results.filter(r => r.status === "fulfilled" && r.value === true).length;
    const failureCount = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && r.value === false)).length;
    
    console.log(`Cycle check complete. Processed: ${circlesWithEndedCycles.length}, Success: ${successCount}, Failed: ${failureCount}`);
    
    // Step 3: Log analytics
    await logCycleCheck(circlesWithEndedCycles.length, successCount, failureCount);
    
    return new Response(JSON.stringify({
      success: true,
      message: "Daily cycle check completed",
      circles_checked: circlesWithEndedCycles.length,
      payouts_processed: successCount,
      payouts_failed: failureCount,
      details: circlesWithEndedCycles.map((circle, index) => ({
        circle_id: circle.id,
        circle_name: circle.name,
        member_id: circle.member_id,
        next_payout_date: circle.next_payout_date,
        success: results[index].status === "fulfilled" && (results[index] as PromiseFulfilledResult<boolean>).value === true,
      }))
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in do-daily-check function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

