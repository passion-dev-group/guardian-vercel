
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InvitePayload = {
  userId: string;
  circleId?: string; 
  recipients: Array<{
    email?: string;
    phone?: string;
    matched?: boolean;
    userId?: string;
  }>;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, circleId, recipients } = await req.json() as InvitePayload;
    
    // Track invitations sent
    console.log(`Processing invitations from user ${userId} for circle ${circleId || "none"}`);
    
    // Process each recipient
    const results = await Promise.all(recipients.map(async (recipient) => {
      try {
        if (recipient.matched && recipient.userId) {
          // For existing users, create in-app notification
          console.log(`Sending in-app notification to user: ${recipient.userId}`);
          
          // Here we would create a notification in a notifications table
          // For this implementation, we'll just log it
          return { success: true, recipient, type: "in_app" };
          
        } else {
          // For non-users, create an invite in the database
          console.log(`Creating invite for: ${recipient.email || recipient.phone}`);
          
          // Store the invite in the database
          const { data: invite, error } = await supabase
            .from("invites")
            .insert({
              sender_id: userId,
              recipient_email: recipient.email,
              recipient_phone: recipient.phone,
              invite_type: recipient.email ? "email" : "sms",
              circle_id: circleId || null,
            })
            .select("id")
            .single();
            
          if (error) throw error;
          
          // In a production app, we'd actually send the email/SMS here
          // using a service like SendGrid, Twilio, etc.
          console.log(`Would send ${recipient.email ? "email" : "SMS"} invitation with ID: ${invite.id}`);
          
          return { 
            success: true, 
            recipient,
            type: recipient.email ? "email" : "sms",
            inviteId: invite.id
          };
        }
      } catch (error) {
        console.error(`Error processing recipient:`, error);
        return { success: false, recipient, error: error.message };
      }
    }));
    
    return new Response(JSON.stringify({ 
      success: true, 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
