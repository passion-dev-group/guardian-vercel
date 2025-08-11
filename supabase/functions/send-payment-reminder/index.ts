import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// This will be available as a secret environment variable in production
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "support@miturn.org";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://guardian-vercel.vercel.app";
const supabaseUrl = "https://rnctzmgmoopmfohdypcb.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PaymentReminderPayload {
  circleId: string;
  memberId: string;
  adminUserId: string;
  reminderType?: "gentle" | "urgent" | "overdue";
  memberEmail?: string; // Add this field to pass email from frontend
  memberName?: string; // Add this field to pass name from frontend
}

async function getCircleDetails(circleId: string) {
  const { data, error } = await supabase
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching circle details:", error);
    return null;
  }
  
  // If we have a created_by user, fetch their profile separately
  if (data.created_by) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", data.created_by)
      .maybeSingle();
      
    if (!profileError && profileData) {
      data.creator_profile = profileData;
    }
  }
  
  return data;
}

async function getMemberDetails(memberId: string, circleId: string) {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("id", memberId)
    .eq("circle_id", circleId)
    .single();
    
  if (error) {
    console.error("Error fetching member details:", error);
    return null;
  }
  
  // Fetch the member's profile separately
  if (data.user_id) {
    console.log("Fetching profile for user_id:", data.user_id);
    
    // Try to get profile from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", data.user_id)
      .maybeSingle();
      
    console.log("Profile fetch result:", { profileData, profileError });
    
    // Get email from auth.users table using the service role key
    let userEmail = null;
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(data.user_id);
      if (!authError && authUser.user) {
        userEmail = authUser.user.email;
        console.log("Email fetched from auth:", userEmail);
      } else {
        console.error("Error fetching auth user:", authError);
      }
    } catch (e) {
      console.log("Could not fetch from auth.users:", e);
    }
    
    if (profileData) {
      data.profile = {
        ...profileData,
        email: userEmail
      };
      console.log("Profile attached to member data:", data.profile);
    } else {
      console.error("Failed to fetch profile:", profileError);
      // Set a default profile to avoid null reference errors
      data.profile = {
        display_name: "Unknown User",
        email: userEmail,
        avatar_url: null
      };
    }
  } else {
    console.error("No user_id found in member data:", data);
  }
  
  return data;
}

async function getUserDetails(userId: string) {
  // Get profile data from profiles table
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
    
  if (profileError) {
    console.error("Error fetching profile data:", profileError);
  }
  
  // Get email from auth.users table
  let userEmail = null;
  try {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (!authError && authUser.user) {
      userEmail = authUser.user.email;
      console.log("Email fetched from auth for user:", userId, userEmail);
    } else {
      console.error("Error fetching auth user:", authError);
    }
  } catch (e) {
    console.log("Could not fetch from auth.users:", e);
  }
  
  return {
    display_name: profileData?.display_name || "Unknown User",
    email: userEmail
  };
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
  
  const baseUrl = FRONTEND_URL; // Replace with your actual domain
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
        from: { email: SENDGRID_FROM_EMAIL, name: "MiTurn Payment Reminders" },
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
    const { circleId, memberId, adminUserId, reminderType, memberEmail, memberName } = await req.json() as PaymentReminderPayload;
    
    if (!circleId || !memberId || !adminUserId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: circleId, memberId, or adminUserId" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if the user is a member of this circle (either admin or regular member)
    const { data: userMembership, error: membershipError } = await supabase
      .from("circle_members")
      .select("is_admin")
      .eq("circle_id", circleId)
      .eq("user_id", adminUserId)
      .single();

    if (membershipError || !userMembership) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User is not a member of this circle" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if the member being reminded is overdue
    const { data: targetMember, error: targetError } = await supabase
      .from("circle_members")
      .select("id, user_id")
      .eq("id", memberId)
      .eq("circle_id", circleId)
      .single();

    if (targetError || !targetMember) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Member not found in this circle" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Allow reminders if user is admin OR if the target member is overdue
    // For overdue members, any circle member can send a reminder
    const isAdmin = userMembership.is_admin;
    const isOverdue = false; // We'll determine this from the member's status

    // Get the member's contribution status to check if overdue
    const { data: lastContribution, error: contributionError } = await supabase
      .from("circle_transactions")
      .select("transaction_date, status")
      .eq("circle_id", circleId)
      .eq("user_id", targetMember.user_id)
      .eq("type", "contribution")
      .order("transaction_date", { ascending: false })
      .limit(1);

    let isMemberOverdue = false;
    if (!contributionError && lastContribution && lastContribution.length > 0) {
      const lastContributionDate = new Date(lastContribution[0].transaction_date);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      if (lastContribution[0].status !== "completed" || lastContributionDate < oneMonthAgo) {
        isMemberOverdue = true;
      }
    } else {
      // If no contributions found, consider overdue
      isMemberOverdue = true;
    }

    // Allow if admin OR if member is overdue
    if (!isAdmin && !isMemberOverdue) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Only admins can send reminders to members who are not overdue" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get circle details
    const circleDetails = await getCircleDetails(circleId);
    if (!circleDetails) {
      console.error("Circle not found:", circleId);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Circle not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Circle details fetched:", {
      id: circleDetails.id,
      name: circleDetails.name,
      contribution_amount: circleDetails.contribution_amount,
      frequency: circleDetails.frequency
    });

    // Get member details
    const memberDetails = await getMemberDetails(memberId, circleId);
    if (!memberDetails) {
      console.error("Member not found:", { memberId, circleId });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Member not found in this circle" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Member details fetched:", {
      id: memberDetails.id,
      user_id: memberDetails.user_id,
      profile: memberDetails.profile,
      raw_member_data: memberDetails
    });

    // Get user details (could be admin or regular member)
    const userDetails = await getUserDetails(adminUserId);
    if (!userDetails) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Permission check results:", {
      isAdmin: userMembership.is_admin,
      isMemberOverdue,
      user_id: adminUserId,
      target_member_id: targetMember.user_id
    });

    // Use email and name from payload if available, otherwise fall back to profile data
    const recipientName = memberName || memberDetails.profile?.display_name || "Circle Member";
    let recipientEmail = memberEmail || memberDetails.profile?.email;
    
    // If still no email, try to get it directly from auth.users as a last resort
    if (!recipientEmail && memberDetails.user_id) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(memberDetails.user_id);
        if (!authError && authUser.user) {
          recipientEmail = authUser.user.email;
          console.log("Email fetched directly from auth as fallback:", recipientEmail);
        }
      } catch (e) {
        console.log("Could not fetch email from auth as fallback:", e);
      }
    }
    
    const circleName = circleDetails.name;
    const contributionAmount = circleDetails.contribution_amount;
    const frequency = circleDetails.frequency;
    const adminName = userDetails.display_name || "Circle Member";

    console.log("Extracted data:", {
      recipientName,
      recipientEmail,
      circleName,
      contributionAmount,
      frequency,
      adminName
    });

    if (!recipientEmail) {
      console.error("Member has no email address. Full member details:", {
        memberDetails,
        profile: memberDetails.profile,
        user_id: memberDetails.user_id,
        has_profile: !!memberDetails.profile,
        profile_keys: memberDetails.profile ? Object.keys(memberDetails.profile) : 'no profile'
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Member has no email address",
        debug_info: {
          has_profile: !!memberDetails.profile,
          profile_keys: memberDetails.profile ? Object.keys(memberDetails.profile) : 'no profile',
          user_id: memberDetails.user_id
        }
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
    try {
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
      } else {
        console.log("Reminder transaction logged successfully");
      }
    } catch (logError) {
      console.error("Error logging reminder transaction:", logError);
      // Don't fail the entire operation if logging fails
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
