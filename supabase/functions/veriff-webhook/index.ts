import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-hmac-signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const body = await req.text();

  console.log("Received webhook body:", body);

  const event = JSON.parse(body);
  console.log("Parsed event:", JSON.stringify(event, null, 2));

  // Extract data from the webhook payload
  const verification = event.verification;
  const vendorData = verification?.vendorData; // This is the user_id
  const veriffStatus = verification?.status;
  const veriffReason = verification?.reason;

  console.log("Vendor data (user_id):", vendorData);
  console.log("Veriff status:", veriffStatus);
  console.log("Veriff reason:", veriffReason);

  if (!vendorData) {
    console.log("No vendor data found in webhook");
    return new Response("No vendor data found", { 
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Find user verification record by user_id (vendorData)
  const { data: userVerification, error } = await supabase
    .from("user_verifications")
    .select("*")
    .eq("user_id", vendorData)
    .single();

  if (error || !userVerification) {
    console.log("User verification not found for user_id:", vendorData);
    return new Response("User verification not found", { 
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  console.log("Found user verification:", userVerification);

  // Update verification status with the three fields
  const { error: updateError } = await supabase
    .from("user_verifications")
    .update({ 
      veriff_status: veriffStatus,
      veriff_reason: veriffReason,
      veriff_response: event, // Store the entire webhook response,
      status: veriffStatus
    })
    .eq("user_id", vendorData);

  if (updateError) {
    console.log("Error updating user verification:", updateError);
    return new Response("Error updating verification", { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  console.log("Successfully updated user verification for user_id:", vendorData);

  return new Response("OK", { 
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}); 