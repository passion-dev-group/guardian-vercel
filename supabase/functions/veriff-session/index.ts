import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// const veriffApiKey = "33f30109-d546-417b-905e-905fe2dfbded";
// const veriffSecretKey = "2e8ad8ef-0932-40ad-bf0b-59d278854114";
// const veriffBaseUrl = "https://stationapi.veriff.com";

// const veriffApiKey = Deno.env.get("VERIFF_API_KEY")!;
// const veriffSecretKey = Deno.env.get("VERIFF_SECRET_KEY")!;
// const veriffBaseUrl = Deno.env.get("VERIFF_BASE_URL")!;

const veriffApiKey = Deno.env.get("VERIFF_API_KEY_TEST")!;
const veriffSecretKey = Deno.env.get("VERIFF_SECRET_KEY_TEST")!;
const veriffBaseUrl = Deno.env.get("VERIFF_BASE_URL_TEST")!;

// Helper function to generate HMAC signature using Web Crypto API
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  // Skip JWT verification for this function
  // This function is called from the frontend and doesn't need JWT auth

  try {
    const { user_id, email, file_base64, file_name } = await req.json();

    if (!user_id || !email || !file_base64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      });
    }

    // 1. Create Veriff session
    const sessionBody = {
      verification: {
        callback: "https://www.veriff.com/get-verified?navigation=slim",
        person: {
          email: email,
        },
        document: {
          type: "DRIVERS_LICENSE",
        },
        vendorData: user_id,
        timestamp: new Date().toISOString(),
      },
    };

    console.log("Session body:", JSON.stringify(sessionBody, null, 2));

    // Generate HMAC signature for session creation
    const sessionPayloadString = JSON.stringify(sessionBody);
    const sessionSignature = await generateHmacSignature(sessionPayloadString, veriffSecretKey);

    const sessionResponse = await fetch(`${veriffBaseUrl}/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-CLIENT": veriffApiKey,
        "X-HMAC-SIGNATURE": sessionSignature,
      },
      body: sessionPayloadString,
    });

    const sessionData = await sessionResponse.json();
    console.log("Session response:", sessionData);

    if (!sessionData.verification?.id) {
      return new Response(JSON.stringify({ error: "Failed to create Veriff session" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      });
    }

    const sessionId = sessionData.verification.id;
    const verificationUrl = sessionData.verification.url;

    // 2. Upload document to Veriff
    const uploadPayload = {
      image: {
        context: "document-front",
        content: file_base64,
      },
    };

    // Generate HMAC signature
    const payloadString = JSON.stringify(uploadPayload);
    const signature = await generateHmacSignature(payloadString, veriffSecretKey);

    console.log("Upload url:", `${veriffBaseUrl}/v1/sessions/${sessionId}/media`);
    console.log("Upload payload string:", payloadString);
    console.log("Upload signature:", signature);

    const uploadResponse = await fetch(`${veriffBaseUrl}/v1/sessions/${sessionId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-CLIENT": veriffApiKey,
        "X-HMAC-SIGNATURE": signature,
      },
      body: payloadString,
    });

    const uploadData = await uploadResponse.json();
    console.log("Upload response:", uploadData);

    if (uploadData.status !== "success") {
      return new Response(JSON.stringify({ error: "Failed to upload document to Veriff" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      });
    }

    // 3. Store session info in database
    await supabase
      .from("user_verifications")
      .insert({
        user_id: user_id,
        veriff_session_id: sessionId,
        status: "pending",
        submitted_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionId,
        verificationUrl: verificationUrl,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in veriff-session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 500,
    });
  }
}); 