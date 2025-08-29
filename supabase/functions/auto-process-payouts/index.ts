import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Starting automatic payout processing...')

    // Get all circles that might be ready for payout
    const { data: circles, error: circlesError } = await supabase
      .from('circles')
      .select('id, name, frequency, contribution_amount, created_at')
      .eq('status', 'active') // Only active circles

    if (circlesError) {
      console.error('Error fetching circles:', circlesError)
      throw circlesError
    }

    console.log(`Found ${circles?.length || 0} active circles to check`)

    let totalPayoutsProcessed = 0
    let totalErrors = 0

    // Process each circle
    for (const circle of circles || []) {
      try {
        const payoutResult = await processCirclePayout(supabase, circle)
        if (payoutResult.processed) {
          totalPayoutsProcessed++
          console.log(`✅ Processed payout for circle: ${circle.name}`)
        }
      } catch (error) {
        totalErrors++
        console.error(`❌ Error processing circle ${circle.name}:`, error)
      }
    }

    console.log(`🎯 Auto-payout processing complete. Processed: ${totalPayoutsProcessed}, Errors: ${totalErrors}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-payout processing completed',
        summary: {
          circles_checked: circles?.length || 0,
          payouts_processed: totalPayoutsProcessed,
          errors: totalErrors
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Auto-payout processing failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Auto-payout processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processCirclePayout(supabase: any, circle: any) {
  const now = new Date()
  
  // Get circle members with payout positions
  const { data: members, error: membersError } = await supabase
    .from('circle_members')
    .select(`
      id,
      user_id,
      payout_position,
      next_payout_date,
      profiles!inner(display_name)
    `)
    .eq('circle_id', circle.id)
    .not('payout_position', 'is', null)
    .order('payout_position', { ascending: true })

  if (membersError) {
    throw membersError
  }

  if (!members || members.length === 0) {
    console.log(`Circle ${circle.name} has no members with payout positions`)
    return { processed: false, reason: 'no_members' }
  }

  // Find the member in position 1 (next to receive payout)
  const nextPayoutMember = members.find(m => m.payout_position === 1)
  if (!nextPayoutMember) {
    console.log(`Circle ${circle.name} has no member in payout position 1`)
    return { processed: false, reason: 'no_position_1_member' }
  }

  // Check if it's time for payout
  if (!nextPayoutMember.next_payout_date) {
    console.log(`Circle ${circle.name} member ${nextPayoutMember.profiles.display_name} has no payout date set`)
    return { processed: false, reason: 'no_payout_date' }
  }

  const payoutDate = new Date(nextPayoutMember.next_payout_date)
  if (now < payoutDate) {
    console.log(`Circle ${circle.name} payout not due yet. Due: ${payoutDate.toISOString()}, Now: ${now.toISOString()}`)
    return { processed: false, reason: 'payout_not_due' }
  }

  // Check if there are sufficient funds available for payout
  const { data: contributions, error: contributionsError } = await supabase
    .from('circle_transactions')
    .select('amount, status, metadata')
    .eq('circle_id', circle.id)
    .eq('type', 'contribution')
    .eq('status', 'completed')

  if (contributionsError) {
    throw contributionsError
  }

  // Filter contributions that are actually available (confirmed by Plaid)
  const availableContributions = contributions?.filter(tx => 
    tx.metadata && 
    tx.metadata.event_type === 'posted' && 
    tx.status === 'completed'
  ) || []

  const totalAvailable = availableContributions.reduce((sum, tx) => sum + tx.amount, 0)

  // Get total amount already paid out
  const { data: payouts, error: payoutsError } = await supabase
    .from('circle_transactions')
    .select('amount')
    .eq('circle_id', circle.id)
    .eq('type', 'payout')
    .eq('status', 'completed')

  if (payoutsError) {
    throw payoutsError
  }

  const totalPaidOut = payouts?.reduce((sum, tx) => sum + tx.amount, 0) || 0
  const availableForPayout = totalAvailable - totalPaidOut

  if (availableForPayout < circle.contribution_amount) {
    console.log(`Circle ${circle.name} insufficient funds for payout. Available: ${availableForPayout}, Required: ${circle.contribution_amount}`)
    return { processed: false, reason: 'insufficient_funds' }
  }

  console.log(`🎯 Processing automatic payout for circle ${circle.name}:`)
  console.log(`   Member: ${nextPayoutMember.profiles.display_name}`)
  console.log(`   Amount: ${circle.contribution_amount}`)
  console.log(`   Available pool: ${availableForPayout}`)

  // Create payout transaction record
  const { data: payoutTransaction, error: transactionError } = await supabase
    .from('circle_transactions')
    .insert({
      circle_id: circle.id,
      user_id: nextPayoutMember.user_id,
      type: 'payout',
      amount: circle.contribution_amount,
      status: 'processing',
      transaction_date: now.toISOString(),
      description: `Automatic payout from ${circle.name}`,
      metadata: {
        auto_processed: true,
        trigger: 'cycle_end',
        circle_frequency: circle.frequency,
        available_pool: availableForPayout
      }
    })
    .select()
    .single()

  if (transactionError) {
    throw transactionError
  }

  // Update member's payout position and next payout date
  const maxPosition = Math.max(...members.map(m => m.payout_position || 0))
  const nextPosition = (nextPayoutMember.payout_position || 0) + 1
  const newPosition = nextPosition > maxPosition ? 1 : nextPosition

  // Calculate next payout date based on frequency
  const nextPayoutDate = new Date()
  if (circle.frequency === 'weekly') {
    nextPayoutDate.setDate(nextPayoutDate.getDate() + 7)
  } else if (circle.frequency === 'biweekly') {
    nextPayoutDate.setDate(nextPayoutDate.getDate() + 14)
  } else {
    nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1)
  }

  // Update all members' positions
  const updatedMembers = await Promise.all(
    members.map(async (member) => {
      let newPayoutPosition = member.payout_position
      let newNextPayoutDate = member.next_payout_date

      if (member.payout_position === 1) {
        // Current payout member gets moved to the end
        newPayoutPosition = maxPosition
        newNextPayoutDate = null
      } else if (member.payout_position === newPosition) {
        // Next payout member gets position 1
        newPayoutPosition = 1
        newNextPayoutDate = nextPayoutDate.toISOString()
      } else if (member.payout_position > 1) {
        // Members after position 1 move up by 1
        newPayoutPosition = member.payout_position - 1
      }

      const { error: updateError } = await supabase
        .from('circle_members')
        .update({
          payout_position: newPayoutPosition,
          next_payout_date: newNextPayoutDate
        })
        .eq('id', member.id)

      if (updateError) {
        throw updateError
      }

      return {
        ...member,
        payout_position: newPayoutPosition,
        next_payout_date: newNextPayoutDate
      }
    })
  )

  console.log(`✅ Successfully processed payout and advanced rotation for circle ${circle.name}`)
  console.log(`   New payout order:`, updatedMembers.map(m => `${m.profiles.display_name}: #${m.payout_position}`))

  return { 
    processed: true, 
    payout_amount: circle.contribution_amount,
    member_name: nextPayoutMember.profiles.display_name,
    new_payout_position: newPosition
  }
}
