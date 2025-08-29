import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests (cron jobs)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the Supabase function URL from environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return res.status(500).json({ error: 'Configuration error' })
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-process-payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase function error:', response.status, errorText)
      return res.status(response.status).json({ 
        error: 'Supabase function failed',
        status: response.status,
        details: errorText
      })
    }

    const result = await response.json()
    console.log('Auto-payout processing completed:', result)

    return res.status(200).json({
      success: true,
      message: 'Auto-payout processing triggered successfully',
      result
    })

  } catch (error) {
    console.error('Error triggering auto-payout processing:', error)
    return res.status(500).json({ 
      error: 'Failed to trigger auto-payout processing',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
