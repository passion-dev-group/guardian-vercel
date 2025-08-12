import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentProcessPayload {
  circleId: string;
  action: "initiate_transfer" | "check_status" | "process_contribution" | "process_payout";
  userId?: string;
  amount?: number;
  transferId?: string;
  accountId?: string;
  accessToken?: string;
}

interface PlaidTransferRequest {
  access_token: string;
  account_id: string;
  authorization_id: string;
  type: "debit" | "credit";
  network: "ach" | "wire";
  amount: string;
  description: string;
  ach_class: "ppd" | "web";
  user: {
    legal_name: string;
    email_address: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  metadata: {
    circle_id: string;
    user_id: string;
    transaction_type: "contribution" | "payout";
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { circleId, action, userId, amount, transferId, accountId, accessToken }: PaymentProcessPayload = await req.json();

    if (!circleId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID")!;
    const plaidSecret = Deno.env.get("PLAID_SECRET")!;
    const plaidEnv = Deno.env.get("PLAID_ENV") || "sandbox";

    if (!plaidClientId || !plaidSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Plaid credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "initiate_transfer":
        if (!userId || !amount || !accountId || !accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing transfer parameters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await initiatePlaidTransfer(supabase, plaidClientId, plaidSecret, plaidEnv, {
          circleId,
          userId,
          amount,
          accountId,
          accessToken
        });
        break;
      
      case "check_status":
        if (!transferId) {
          return new Response(
            JSON.stringify({ success: false, error: "Transfer ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await checkTransferStatus(supabase, plaidClientId, plaidSecret, plaidEnv, transferId);
        break;
      
      case "process_contribution":
        if (!userId || !amount || !accountId || !accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing contribution parameters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await processContribution(supabase, plaidClientId, plaidSecret, plaidEnv, {
          circleId,
          userId,
          amount,
          accountId,
          accessToken
        });
        break;
      
      case "process_payout":
        if (!userId || !amount || !accountId || !accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing payout parameters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await processPayout(supabase, plaidClientId, plaidSecret, plaidEnv, {
          circleId,
          userId,
          amount,
          accountId,
          accessToken
        });
        break;
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action specified" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-payments:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Initiate a Plaid transfer
async function initiatePlaidTransfer(
  supabase: any, 
  clientId: string, 
  secret: string, 
  env: string,
  params: { circleId: string; userId: string; amount: number; accountId: string; accessToken: string }
) {
  try {
    const { circleId, userId, amount, accountId, accessToken } = params;

    // Get user profile for transfer details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Get circle details
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('name')
      .eq('id', circleId)
      .single();

    if (circleError) throw circleError;

    // Create transfer authorization first
    const authResponse = await fetch(`https://${env === 'sandbox' ? 'sandbox' : 'production'}.plaid.com/transfer/authorization/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: accessToken,
        account_id: accountId,
        type: "debit",
        network: "ach",
        amount: amount.toString(),
        ach_class: "ppd",
        user: {
          legal_name: profile.display_name || "User",
          email_address: profile.email || "",
          address: {
            street: "123 Main St",
            city: "City",
            state: "ST",
            zip: "12345",
            country: "US"
          }
        },
        description: `Contribution to ${circle.name}`,
        metadata: {
          circle_id: circleId,
          user_id: userId,
          transaction_type: "contribution"
        }
      })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      throw new Error(`Plaid authorization failed: ${errorData.error_message || 'Unknown error'}`);
    }

    const authData = await authResponse.json();
    const authorizationId = authData.authorization.id;

    // Create the actual transfer
    const transferResponse = await fetch(`https://${env === 'sandbox' ? 'sandbox' : 'production'}.plaid.com/transfer/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: accessToken,
        account_id: accountId,
        authorization_id: authorizationId,
        type: "debit",
        network: "ach",
        amount: amount.toString(),
        description: `Contribution to ${circle.name}`,
        ach_class: "ppd",
        user: {
          legal_name: profile.display_name || "User",
          email_address: profile.email || "",
          address: {
            street: "123 Main St",
            city: "City",
            state: "ST",
            zip: "12345",
            country: "US"
          }
        },
        metadata: {
          circle_id: circleId,
          user_id: userId,
          transaction_type: "contribution"
        }
      })
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      throw new Error(`Plaid transfer failed: ${errorData.error_message || 'Unknown error'}`);
    }

    const transferData = await transferResponse.json();
    const transfer = transferData.transfer;

    // Log the transfer in our database
    const { error: logError } = await supabase
      .from('circle_transactions')
      .insert({
        circle_id: circleId,
        user_id: userId,
        type: 'contribution',
        amount: amount,
        status: 'processing',
        transaction_date: new Date().toISOString(),
        plaid_transfer_id: transfer.id,
        plaid_authorization_id: authorizationId,
        description: `Contribution to ${circle.name}`,
        metadata: {
          plaid_account_id: accountId,
          plaid_access_token: accessToken,
          transfer_status: transfer.status
        }
      });

    if (logError) throw logError;

    return {
      message: "Transfer initiated successfully",
      transfer_id: transfer.id,
      authorization_id: authorizationId,
      status: transfer.status,
      amount: amount,
      circle_name: circle.name
    };

  } catch (error) {
    console.error("Error initiating Plaid transfer:", error);
    throw error;
  }
}

// Check transfer status
async function checkTransferStatus(
  supabase: any, 
  clientId: string, 
  secret: string, 
  env: string,
  transferId: string
) {
  try {
    // Get transfer status from Plaid
    const response = await fetch(`https://${env === 'sandbox' ? 'sandbox' : 'production'}.plaid.com/transfer/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        transfer_id: transferId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Plaid transfer status check failed: ${errorData.error_message || 'Unknown error'}`);
    }

    const data = await response.json();
    const transfer = data.transfer;

    // Update our database with the current status
    const { error: updateError } = await supabase
      .from('circle_transactions')
      .update({
        status: transfer.status === 'posted' ? 'completed' : 
                transfer.status === 'failed' ? 'failed' : 'processing',
        processed_at: new Date().toISOString(),
        metadata: {
          ...transfer.metadata,
          transfer_status: transfer.status,
          last_updated: new Date().toISOString()
        }
      })
      .eq('plaid_transfer_id', transferId);

    if (updateError) throw updateError;

    return {
      transfer_id: transferId,
      status: transfer.status,
      amount: transfer.amount,
      created: transfer.created,
      last_updated: transfer.last_updated,
      ach_class: transfer.ach_class,
      network: transfer.network
    };

  } catch (error) {
    console.error("Error checking transfer status:", error);
    throw error;
  }
}

// Process a contribution (debit from user's account)
async function processContribution(
  supabase: any, 
  clientId: string, 
  secret: string, 
  env: string,
  params: { circleId: string; userId: string; amount: number; accountId: string; accessToken: string }
) {
  try {
    // Initiate the transfer (debit from user's account)
    const transferResult = await initiatePlaidTransfer(supabase, clientId, secret, env, params);
    
    // Schedule status check for later
    setTimeout(async () => {
      try {
        await checkTransferStatus(supabase, clientId, secret, env, transferResult.transfer_id);
      } catch (error) {
        console.error("Error in scheduled status check:", error);
      }
    }, 30000); // Check after 30 seconds

    return {
      message: "Contribution processing initiated",
      transfer_id: transferResult.transfer_id,
      status: "processing",
      amount: params.amount,
      estimated_completion: "2-3 business days"
    };

  } catch (error) {
    console.error("Error processing contribution:", error);
    throw error;
  }
}

// Process a payout (credit to user's account)
async function processPayout(
  supabase: any, 
  clientId: string, 
  secret: string, 
  env: string,
  params: { circleId: string; userId: string; amount: number; accountId: string; accessToken: string }
) {
  try {
    const { circleId, userId, amount, accountId, accessToken } = params;

    // Get user profile for payout details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Get circle details
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('name')
      .eq('id', circleId)
      .single();

    if (circleError) throw circleError;

    // Create transfer authorization for payout (credit)
    const authResponse = await fetch(`https://${env === 'sandbox' ? 'sandbox' : 'production'}.plaid.com/transfer/authorization/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: accessToken,
        account_id: accountId,
        type: "credit", // Credit for payout
        network: "ach",
        amount: amount.toString(),
        ach_class: "ppd",
        user: {
          legal_name: profile.display_name || "User",
          email_address: profile.email || "",
          address: {
            street: "123 Main St",
            city: "City",
            state: "ST",
            zip: "12345",
            country: "US"
          }
        },
        description: `Payout from ${circle.name}`,
        metadata: {
          circle_id: circleId,
          user_id: userId,
          transaction_type: "payout"
        }
      })
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      throw new Error(`Plaid payout authorization failed: ${errorData.error_message || 'Unknown error'}`);
    }

    const authData = await authResponse.json();
    const authorizationId = authData.authorization.id;

    // Create the payout transfer
    const transferResponse = await fetch(`https://${env === 'sandbox' ? 'sandbox' : 'production'}.plaid.com/transfer/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
      body: JSON.stringify({
        access_token: accessToken,
        account_id: accountId,
        authorization_id: authorizationId,
        type: "credit", // Credit for payout
        network: "ach",
        amount: amount.toString(),
        description: `Payout from ${circle.name}`,
        ach_class: "ppd",
        user: {
          legal_name: profile.display_name || "User",
          email_address: profile.email || "",
          address: {
            street: "123 Main St",
            city: "City",
            state: "ST",
            zip: "12345",
            country: "US"
          }
        },
        metadata: {
          circle_id: circleId,
          user_id: userId,
          transaction_type: "payout"
        }
      })
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      throw new Error(`Plaid payout transfer failed: ${errorData.error_message || 'Unknown error'}`);
    }

    const transferData = await transferResponse.json();
    const transfer = transferData.transfer;

    // Log the payout in our database
    const { error: logError } = await supabase
      .from('circle_transactions')
      .insert({
        circle_id: circleId,
        user_id: userId,
        type: 'payout',
        amount: amount,
        status: 'processing',
        transaction_date: new Date().toISOString(),
        plaid_transfer_id: transfer.id,
        plaid_authorization_id: authorizationId,
        description: `Payout from ${circle.name}`,
        metadata: {
          plaid_account_id: accountId,
          plaid_access_token: accessToken,
          transfer_status: transfer.status
        }
      });

    if (logError) throw logError;

    return {
      message: "Payout initiated successfully",
      transfer_id: transfer.id,
      authorization_id: authorizationId,
      status: transfer.status,
      amount: amount,
      circle_name: circle.name,
      estimated_completion: "1-2 business days"
    };

  } catch (error) {
    console.error("Error processing payout:", error);
    throw error;
  }
}
