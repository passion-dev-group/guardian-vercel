import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// This will be available as a secret environment variable in production
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";

const supabaseUrl = "https://rnctzmgmoopmfohdypcb.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PaymentReminderPayload {
  circleId: string;
  memberId: string;
  adminUserId: string;
  reminderType?: "gentle" | "urgent" | "overdue";
}

async function getCircleDetails(circleId: string) {
  const { data, error } = await supabase
    .from("circles")
    .select(`
      *,
      profiles!circles_created_by_fkey (
        display_name,
        email
      )
    `)
    .eq("id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching circle details:", error);
    return null;
  }
  
  return data;
}

async function getMemberDetails(memberId: string, circleId: string) {
  const { data, error } = await supabase
    .from("circle_members")
    .select(`
      *,
      profiles!circle_members_user_id_fkey (
        display_name,
        email,
        avatar_url
      )
    `)
    .eq("id", memberId)
    .eq("circle_id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching member details:", error);
    return null;
  }
  
  return data;
}

async function getAdminDetails(adminUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", adminUserId)
    .single();
    
  if (error) {
    console.error("Error fetching admin details:", error);
    return null;
  }
  
  return data;
}

async function sendPaymentReminderEmail(
  recipientEmail: string,
  recipientName: string,
  circleName: string,
  contributionAmount: number,
  frequency: string,
  adminName: string,
  reminderType: string = "gentle"
) {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.length === 0) {
    console.log("No SendGrid API key found, skipping email sending");
    return false;
  }
  
  const baseUrl = "https://miturn.app"; // Replace with your actual domain
  const dashboardLink = `${baseUrl}/dashboard`;
  
  let subject: string;
  let urgencyText: string;
  let urgencyColor: string;
  
  switch (reminderType) {
    case "urgent":
      subject = `URGENT: Payment reminder for ${circleName} savings circle`;
      urgencyText = "This is a friendly reminder that your contribution is due soon.";
      urgencyColor = "#f59e0b";
      break;
    case "overdue":
      subject = `OVERDUE: Payment required for ${circleName} savings circle`;
      urgencyText = "Your contribution is overdue. Please make your payment as soon as possible.";
      urgencyColor = "#ef4444";
      break;
    default:
      subject = `Payment reminder for ${circleName} savings circle`;
      urgencyText = "This is a friendly reminder that your contribution is due soon.";
      urgencyColor = "#10b981";
  }
  
  const textContent = `Hello ${recipientName || "there"},

${urgencyText}

Circle: ${circleName}
Contribution Amount: $${contributionAmount}
Frequency: ${frequency}
Admin: ${adminName}

Please log into your MiTurn account to make your contribution:
${dashboardLink}

If you have any questions or need assistance, please contact ${adminName} or reply to this email.

Thank you for your prompt attention to this matter.

Best regards,
The MiTurn Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Reminder - ${circleName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .reminder-box { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor}; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Reminder</h1>
            <p>${circleName} Savings Circle</p>
        </div>
        <div class="content">
            <div class="reminder-box">
                <h2>${urgencyText}</h2>
            </div>
            
            <div class="details">
                <h3>Circle Details:</h3>
                <p><strong>Circle Name:</strong> ${circleName}</p>
                <p><strong>Contribution Amount:</strong> $${contributionAmount}</p>
                <p><strong>Frequency:</strong> ${frequency}</p>
                <p><strong>Admin:</strong> ${adminName}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="${dashboardLink}" class="button">Make Payment</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact ${adminName} or reply to this email.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <div class="footer">
                <p>Best regards,<br>The MiTurn Team</p>
                <p>If you're having trouble with the button above, copy and paste this link into your browser:<br>
                <a href="${dashboardLink}">${dashboardLink}</a></p>
            </div>
        </div>
    </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipientEmail, name: recipientName }],
            subject: subject,
          },
        ],
        from: { email: "reminders@miturn.app", name: "MiTurn Payment Reminders" },
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
      }),
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`Payment reminder email sent successfully to ${recipientEmail}`);
      return true;
    } else {
      console.error(`Failed to send payment reminder email: ${response.status}`, await response.text());
      return false;
    }
  } catch (error) {
    console.error("Error sending payment reminder email:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { circleId, memberId, adminUserId, reminderType } = await req.json() as PaymentReminderPayload;
    
    if (!circleId || !memberId || !adminUserId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: circleId, memberId, or adminUserId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify the admin user is actually an admin of this circle
    const { data: adminMembership, error: adminError } = await supabase
      .from("circle_members")
      .select("is_admin")
      .eq("circle_id", circleId)
      .eq("user_id", adminUserId)
      .eq("is_admin", true)
      .single();

    if (adminError || !adminMembership) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User is not an admin of this circle" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get circle details
    const circleDetails = await getCircleDetails(circleId);
    if (!circleDetails) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Circle not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get member details
    const memberDetails = await getMemberDetails(memberId, circleId);
    if (!memberDetails) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Member not found in this circle" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get admin details
    const adminDetails = await getAdminDetails(adminUserId);
    if (!adminDetails) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Admin user not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const recipientName = memberDetails.profiles?.display_name || "Circle Member";
    const recipientEmail = memberDetails.profiles?.email;
    const circleName = circleDetails.name;
    const contributionAmount = circleDetails.contribution_amount;
    const frequency = circleDetails.frequency;
    const adminName = adminDetails.display_name || "Circle Admin";

    if (!recipientEmail) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Member has no email address" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Send the payment reminder email
    const emailSent = await sendPaymentReminderEmail(
      recipientEmail,
      recipientName,
      circleName,
      contributionAmount,
      frequency,
      adminName,
      reminderType
    );

    // Log the reminder attempt
    const { error: logError } = await supabase
      .from("circle_transactions")
      .insert({
        circle_id: circleId,
        user_id: memberDetails.user_id,
        type: "reminder",
        amount: 0,
        status: emailSent ? "sent" : "failed",
        transaction_date: new Date().toISOString(),
        description: `Payment reminder sent by ${adminName}`,
        metadata: {
          reminder_type: reminderType,
          admin_user_id: adminUserId,
          email_sent: emailSent
        }
      });

    if (logError) {
      console.error("Error logging reminder transaction:", logError);
    }

    // Track the analytics event
    await supabase.functions.invoke("track-analytics-event", {
      body: {
        event: "payment_reminder_sent",
        user_id: adminUserId,
        properties: {
          circle_id: circleId,
          member_id: memberId,
          reminder_type: reminderType,
          success: emailSent,
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      email_sent: emailSent,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      message: emailSent ? "Payment reminder sent successfully" : "Failed to send payment reminder"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in send-payment-reminder function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
