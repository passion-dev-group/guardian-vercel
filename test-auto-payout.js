#!/usr/bin/env node

/**
 * Test script for the auto-payout system
 * Run this to manually trigger the auto-payout processing
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key'

async function testAutoPayout() {
  try {
    console.log('🧪 Testing auto-payout system...')
    console.log(`📡 Calling: ${SUPABASE_URL}/functions/v1/auto-process-payouts`)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-process-payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error:', response.status, errorText)
      return
    }

    const result = await response.json()
    console.log('✅ Success!')
    console.log('📊 Result:', JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAutoPayout()
}

module.exports = { testAutoPayout }
