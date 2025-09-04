import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReferralEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  referrerName: string;
  referralCode: string;
  personalMessage?: string;
}

async function sendReferralEmail(
  recipientEmail: string,
  recipientName: string,
  referrerName: string,
  referralCode: string,
  personalMessage?: string
) {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'invitations@miturn.app';
  
  if (!SENDGRID_API_KEY) {
    console.log("No SendGrid API key found, skipping email sending");
    return { success: false, error: "SendGrid API key not configured" };
  }

  const referralLink = `${Deno.env.get('FRONTEND_URL')?.replace('supabase.co', 'vercel.app') || 'https://your-app.vercel.app'}/signup?ref=${referralCode}`;
  
  const subject = `${referrerName} invited you to start saving together! 💰`;
  
  const textContent = `Hi ${recipientName || 'there'}!

${referrerName} has invited you to join MiTurn, an amazing platform for saving money through savings circles.

${personalMessage ? `Personal message from ${referrerName}: "${personalMessage}"` : ''}

What is MiTurn?
MiTurn helps you save money by joining savings circles with friends, family, or colleagues. Everyone contributes regularly, and members take turns receiving payouts to help with their financial goals.

Why join with ${referrerName}'s referral?
• You'll both earn bonus rewards when you sign up
• Join a trusted community of savers
• Start your savings journey with a friend's support
• Access to group savings circles and individual goals

Ready to start saving? Click the link below or copy it into your browser:
${referralLink}

Questions? Reply to this email or contact ${referrerName} directly.

Happy saving!
The MiTurn Team

---
If you're having trouble with the link above, copy and paste this URL into your browser: ${referralLink}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to start saving with MiTurn!</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f8fafc;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 0;
            font-size: 18px;
            opacity: 0.9;
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .personal-message {
            background: #f3f4f6;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
            font-style: italic;
        }
        .features {
            background: #f8fafc;
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
        }
        .features h3 {
            color: #1f2937;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .features ul {
            margin: 0;
            padding-left: 20px;
        }
        .features li {
            margin-bottom: 8px;
            color: #4b5563;
        }
        .button-container {
            text-align: center;
            margin: 35px 0;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 16px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s ease;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer { 
            background: #f9fafb;
            padding: 30px;
            text-align: center; 
            color: #6b7280; 
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 25px 0;
            text-align: center;
        }
        .stat-item {
            flex: 1;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">💰 MiTurn</div>
            <h1>You're Invited to Save Together! 🎉</h1>
            <p>Start your savings journey with ${referrerName}</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi ${recipientName || 'there'}! 👋
            </div>
            
            <p><strong>${referrerName}</strong> has invited you to join <strong>MiTurn</strong>, where saving money becomes easier and more rewarding through community support.</p>
            
            ${personalMessage ? `
            <div class="personal-message">
                <strong>Personal message from ${referrerName}:</strong><br>
                "${personalMessage}"
            </div>
            ` : ''}
            
            <div class="features">
                <h3>🚀 Why MiTurn?</h3>
                <ul>
                    <li><strong>Savings Circles:</strong> Pool money with friends and take turns receiving payouts</li>
                    <li><strong>Individual Goals:</strong> Set and track personal savings targets</li>
                    <li><strong>Bonus Rewards:</strong> Earn money for referring friends (like you!)</li>
                    <li><strong>Secure & Trusted:</strong> Bank-level security for all transactions</li>
                    <li><strong>Mobile-First:</strong> Manage your savings anywhere, anytime</li>
                </ul>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">$500+</div>
                    <div class="stat-label">Avg Monthly Savings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">95%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">10K+</div>
                    <div class="stat-label">Happy Savers</div>
                </div>
            </div>
            
            <div class="button-container">
                <a href="${referralLink}" class="button">🎯 Start Saving with ${referrerName}</a>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px;">
                <strong>Bonus:</strong> You and ${referrerName} will both earn rewards when you sign up! 💰
            </p>
            
            <p>Have questions? Reply to this email or reach out to ${referrerName} directly. We're here to help you succeed!</p>
        </div>
        
        <div class="footer">
            <p><strong>Happy saving!</strong><br>The MiTurn Team</p>
            <p style="margin-top: 20px;">
                If you're having trouble with the button above, copy and paste this link into your browser:<br>
                <a href="${referralLink}">${referralLink}</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
                This invitation was sent by ${referrerName}. If you don't want to receive emails like this, you can safely ignore this message.
            </p>
        </div>
    </div>
</body>
</html>`;

  const payload = {
    personalizations: [
      {
        to: [{ email: recipientEmail, name: recipientName }],
        subject: subject,
      },
    ],
    from: { 
      email: SENDGRID_FROM_EMAIL, 
      name: `${referrerName} via MiTurn` 
    },
    content: [
      {
        type: "text/plain",
        value: textContent,
      },
      {
        type: "text/html",
        value: htmlContent,
      },
    ],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking: { enable: true }
    },
    categories: ["referral", "invitation"]
  };

  console.log('Sending email with payload:', {
    to: recipientEmail,
    from: SENDGRID_FROM_EMAIL,
    subject: subject.substring(0, 50) + '...'
  });

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`Referral email sent successfully to ${recipientEmail}`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`Failed to send referral email: ${response.status}`, errorText);
      return { 
        success: false, 
        error: `SendGrid API error: ${response.status} - ${errorText}` 
      };
    }
  } catch (error) {
    console.error("Error sending referral email:", error);
    return { 
      success: false, 
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse the request body
    const payload: ReferralEmailPayload = await req.json()
    const { recipientEmail, recipientName, referrerName, referralCode, personalMessage } = payload

    // Validate required fields
    if (!recipientEmail || !referrerName || !referralCode) {
      throw new Error('Missing required fields: recipientEmail, referrerName, or referralCode')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      throw new Error('Invalid email format')
    }

    // Verify the referral code belongs to the authenticated user
    const { data: referralData, error: referralError } = await supabaseClient
      .from('referrals')
      .select('referrer_id')
      .eq('referral_code', referralCode)
      .single()

    console.log('Referral validation:', {
      referralCode,
      userId: user.id,
      referralError: referralError?.message,
      referralData
    });

    if (referralError) {
      throw new Error(`Database error: ${referralError.message}`)
    }

    if (!referralData) {
      throw new Error('Referral code not found')
    }

    if (referralData.referrer_id !== user.id) {
      throw new Error('Unauthorized: referral code belongs to different user')
    }

    // Send the email
    const emailResult = await sendReferralEmail(
      recipientEmail,
      recipientName || recipientEmail.split('@')[0],
      referrerName,
      referralCode,
      personalMessage
    )

    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`)
    }

    // Log the email sending attempt (optional)
    try {
      await supabaseClient
        .from('referral_email_logs')
        .insert({
          referrer_id: user.id,
          recipient_email: recipientEmail,
          referral_code: referralCode,
          sent_at: new Date().toISOString(),
          success: true
        })
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log email sending:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Referral email sent successfully',
        recipient_email: recipientEmail,
        referral_code: referralCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in send-referral-email function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
