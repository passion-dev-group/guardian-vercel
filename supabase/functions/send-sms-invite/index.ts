
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSInvitePayload {
  phone: string;
  circleId: string;
  circleName: string;
  inviterName: string;
}

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

    const { phone, circleId, circleName, inviterName }: SMSInvitePayload = await req.json();
    
    console.log(`Sending SMS invite to ${phone} for circle ${circleName}`);
    
    // Generate invite link
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const baseUrl = "https://your-app-domain.com"; // Replace with actual domain
    const inviteLink = `${baseUrl}/join-circle?code=${inviteCode}`;
    
    // Store the invite in database
    const { error: inviteError } = await supabase
      .from('circle_invites')
      .insert({
        circle_id: circleId,
        invite_code: inviteCode,
        phone: phone,
        created_by: inviterName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteError) {
      console.error("Error storing invite:", inviteError);
      throw inviteError;
    }
    
    // SMS message content
    const message = `Hi! ${inviterName} invited you to join the "${circleName}" savings circle on MiTurn. Join here: ${inviteLink}`;
    
    // In production, integrate with SMS service like Twilio
    // For now, we'll simulate the SMS sending
    console.log(`SMS would be sent to ${phone}: ${message}`);
    
    // Simulate SMS service response
    const smsSuccess = Math.random() > 0.1; // 90% success rate for simulation
    
    if (!smsSuccess) {
      throw new Error("SMS delivery failed");
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      phone,
      message: "SMS invite sent successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in send-sms-invite function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
