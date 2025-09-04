import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');
    
    // Test a simple SendGrid API call
    const testPayload = {
      personalizations: [
        {
          to: [{ email: "work@teleint.com", name: "Test User" }],
          subject: "SendGrid Configuration Test",
        },
      ],
      from: { 
        email: SENDGRID_FROM_EMAIL || "invitations@miturn.app", 
        name: "MiTurn Test" 
      },
      content: [
        {
          type: "text/plain",
          value: "This is a test email to verify SendGrid configuration.",
        },
        {
          type: "text/html",
          value: "<p>This is a test email to verify SendGrid configuration.</p>",
        },
      ],
    };

    console.log('Environment check:', {
      hasApiKey: !!SENDGRID_API_KEY,
      apiKeyLength: SENDGRID_API_KEY?.length || 0,
      fromEmail: SENDGRID_FROM_EMAIL || "not set",
    });

    if (!SENDGRID_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SENDGRID_API_KEY environment variable not set',
          debug: {
            hasApiKey: false,
            fromEmail: SENDGRID_FROM_EMAIL || "not set"
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    
    console.log('SendGrid response:', {
      status: response.status,
      statusText: response.statusText,
      responseBody: responseText
    });

    return new Response(
      JSON.stringify({
        success: response.status >= 200 && response.status < 300,
        sendgridStatus: response.status,
        sendgridResponse: responseText,
        debug: {
          hasApiKey: !!SENDGRID_API_KEY,
          apiKeyPrefix: SENDGRID_API_KEY?.substring(0, 10) + '...',
          fromEmail: SENDGRID_FROM_EMAIL || "invitations@miturn.app"
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Debug function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
