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

interface CircleInvitationPayload {
  circleId: string;
  invitedBy: string;
  recipients: Array<{
    email: string;
    name?: string;
  }>;
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

async function getInviteCode(circleId: string) {
  const { data, error } = await supabase
    .from("circle_invites")
    .select("invite_code")
    .eq("circle_id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching invite code:", error);
    return null;
  }
  
  return data.invite_code;
}

async function sendInvitationEmail(
  recipientEmail: string,
  recipientName: string,
  circleName: string,
  inviterName: string,
  inviteCode: string
) {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.length === 0) {
    console.log("No SendGrid API key found, skipping email sending");
    return false;
  }
  
  const baseUrl = "https://miturn.app"; // Replace with your actual domain
  const inviteLink = `${baseUrl}/join-circle?code=${inviteCode}`;
  
  const subject = `${inviterName} invited you to join their savings circle: ${circleName}`;
  
  const textContent = `Hello ${recipientName || "there"},

${inviterName} has invited you to join their savings circle "${circleName}" on MiTurn!

MiTurn is a platform that helps friends and family save money together through rotating savings and credit associations (ROSCAs).

To join the circle, click on this link:
${inviteLink}

This invitation will expire in 7 days.

If you have any questions, please contact ${inviterName} or reply to this email.

Best regards,
The MiTurn Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to join a savings circle!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Invited! 🎉</h1>
            <p>Join a savings circle on MiTurn</p>
        </div>
        <div class="content">
            <h2>Hello ${recipientName || "there"}!</h2>
            <p><strong>${inviterName}</strong> has invited you to join their savings circle <strong>"${circleName}"</strong> on MiTurn!</p>
            
            <p>MiTurn is a platform that helps friends and family save money together through rotating savings and credit associations (ROSCAs).</p>
            
            <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Join the Circle</a>
            </div>
            
            <p><strong>Important:</strong> This invitation will expire in 7 days.</p>
            
            <p>If you have any questions, please contact ${inviterName} or reply to this email.</p>
            
            <div class="footer">
                <p>Best regards,<br>The MiTurn Team</p>
                <p>If you're having trouble with the button above, copy and paste this link into your browser:<br>
                <a href="${inviteLink}">${inviteLink}</a></p>
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
        from: { email: "invitations@miturn.app", name: "MiTurn Invitations" },
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
      console.log(`Invitation email sent successfully to ${recipientEmail}`);
      return true;
    } else {
      console.error(`Failed to send invitation email: ${response.status}`, await response.text());
      return false;
    }
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { circleId, invitedBy, recipients } = await req.json() as CircleInvitationPayload;
    
    if (!circleId || !invitedBy || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: circleId, invitedBy, or recipients" 
      }), {
        status: 400,
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

    // Get invite code
    const inviteCode = await getInviteCode(circleId);
    if (!inviteCode) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invite code not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const inviterName = circleDetails.profiles?.display_name || "A MiTurn user";
    const circleName = circleDetails.name;

    // Send invitations to all recipients
    const results = await Promise.all(recipients.map(async (recipient) => {
      try {
        const emailSent = await sendInvitationEmail(
          recipient.email,
          recipient.name || "",
          circleName,
          inviterName,
          inviteCode
        );

        // Update the invitation status in the database
        const { error: updateError } = await supabase
          .from("circle_members_invites")
          .update({
            status: emailSent ? "sent" : "failed",
            sent_at: emailSent ? new Date().toISOString() : null,
          })
          .eq("circle_id", circleId)
          .eq("email", recipient.email);

        if (updateError) {
          console.error("Error updating invitation status:", updateError);
        }

        // Track the analytics event
        await supabase.functions.invoke("track-analytics-event", {
          body: {
            event: "circle_invitation_sent",
            user_id: invitedBy,
            properties: {
              circle_id: circleId,
              recipient_email: recipient.email,
              success: emailSent,
            }
          }
        });

        return {
          success: emailSent,
          recipient: recipient.email,
          error: emailSent ? null : "Failed to send email"
        };
      } catch (error) {
        console.error(`Error processing invitation for ${recipient.email}:`, error);
        return {
          success: false,
          recipient: recipient.email,
          error: error.message
        };
      }
    }));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in send-circle-invitation function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 