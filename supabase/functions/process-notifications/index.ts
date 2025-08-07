
// Follow this setup guide to integrate the Deno runtime with your application:
// https://docs.deno.com/runtime/manual/getting_started/javascript-nodejs-comparison
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// This will be available as a secret environment variable in production
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";

const supabaseUrl = "https://rnctzmgmoopmfohdypcb.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  user_id: string;
  circle_id: string | null;
  type: "upcoming_contribution" | "upcoming_payout";
  scheduled_for: string;
  status: "pending" | "sent" | "failed";
}

async function getUser(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
    
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  // Get the user's email from auth.users
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError) {
    console.error("Error fetching user:", userError);
    return null;
  }
  
  return {
    ...data,
    email: userData.user?.email,
  };
}

async function getCircle(circleId: string) {
  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching circle:", error);
    return null;
  }
  
  return data;
}

async function sendEmail(user, notification, circleName = null) {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.length === 0) {
    console.log("No SendGrid API key found, skipping email sending");
    return false;
  }
  
  if (!user.email) {
    console.error("No email address found for user:", user.id);
    return false;
  }
  
  const userName = user.display_name || "MiTurn user";
  
  let subject, textContent, htmlContent;
  
  if (notification.type === "upcoming_payout") {
    subject = circleName 
      ? `Your payout for ${circleName} is coming soon` 
      : "Your savings circle payout is coming soon";
      
    textContent = `Hello ${userName},\n\nYour payout for ${circleName || "your savings circle"} is scheduled soon. Log in to the MiTurn app to see the details and confirm your payment information.\n\nBest regards,\nThe MiTurn Team`;
    
    htmlContent = `<p>Hello ${userName},</p><p>Your payout for <strong>${circleName || "your savings circle"}</strong> is scheduled soon. Log in to the MiTurn app to see the details and confirm your payment information.</p><p>Best regards,<br>The MiTurn Team</p>`;
  } else {
    subject = circleName 
      ? `Your contribution for ${circleName} is due soon` 
      : "Your savings circle contribution is due soon";
      
    textContent = `Hello ${userName},\n\nYour contribution for ${circleName || "your savings circle"} is due soon. Please log in to the MiTurn app to make your payment on time.\n\nBest regards,\nThe MiTurn Team`;
    
    htmlContent = `<p>Hello ${userName},</p><p>Your contribution for <strong>${circleName || "your savings circle"}</strong> is due soon. Please log in to the MiTurn app to make your payment on time.</p><p>Best regards,<br>The MiTurn Team</p>`;
  }
  
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
            to: [{ email: user.email }],
            subject: subject,
          },
        ],
        from: { email: "notifications@miturn.app", name: "MiTurn Notifications" },
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
      console.log(`Email sent successfully to ${user.email}`);
      return true;
    } else {
      console.error(`Failed to send email: ${response.status}`, await response.text());
      return false;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

async function processNotifications() {
  // Get all pending notifications that are due
  const { data: notifications, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString());
    
  if (error) {
    console.error("Error fetching notifications:", error);
    return { processed: 0, success: 0, failed: 0 };
  }
  
  if (!notifications || notifications.length === 0) {
    console.log("No pending notifications to process");
    return { processed: 0, success: 0, failed: 0 };
  }
  
  console.log(`Processing ${notifications.length} notifications`);
  
  let success = 0;
  let failed = 0;
  
  for (const notification of notifications) {
    try {
      // Get user data
      const user = await getUser(notification.user_id);
      if (!user) {
        throw new Error(`User ${notification.user_id} not found`);
      }
      
      // Get circle data if applicable
      let circleName = null;
      if (notification.circle_id) {
        const circle = await getCircle(notification.circle_id);
        if (circle) {
          circleName = circle.name;
        }
      }
      
      // Send notification
      const emailSent = await sendEmail(user, notification, circleName);
      
      // Track the analytics event
      await supabase.functions.invoke("track-analytics-event", {
        body: {
          event: "reminder_sent",
          user_id: notification.user_id,
          properties: {
            notification_id: notification.id,
            notification_type: notification.type,
            circle_id: notification.circle_id,
            success: emailSent,
          }
        }
      });
      
      // Update notification status
      const updateResult = await supabase
        .from("user_notifications")
        .update({
          status: emailSent ? "sent" : "failed",
          sent_at: emailSent ? new Date().toISOString() : null,
        })
        .eq("id", notification.id);
        
      if (updateResult.error) {
        console.error("Error updating notification status:", updateResult.error);
        failed++;
      } else {
        emailSent ? success++ : failed++;
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      
      // Update notification as failed
      await supabase
        .from("user_notifications")
        .update({
          status: "failed",
        })
        .eq("id", notification.id);
        
      failed++;
    }
  }
  
  return { processed: notifications.length, success, failed };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const result = await processNotifications();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in process-notifications function:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
