import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabaseUrl = "https://rnctzmgmoopmfohdypcb.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RotationActionPayload {
  circleId: string;
  action: "initialize" | "advance" | "reset" | "get_status";
  adminUserId?: string;
  memberId?: string; // For manual advancement
}

interface CircleRotationStatus {
  circle_id: string;
  total_members: number;
  current_payout_position: number;
  next_payout_member: string | null;
  next_payout_date: string | null;
  rotation_complete: boolean;
  members: Array<{
    id: string;
    user_id: string;
    payout_position: number | null;
    next_payout_date: string | null;
    display_name: string;
    is_admin: boolean;
  }>;
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
  
  return data;
}

async function getCircleMembers(circleId: string) {
  const { data, error } = await supabase
    .from("circle_members")
    .select(`
      id,
      user_id,
      payout_position,
      next_payout_date,
      is_admin
    `)
    .eq("circle_id", circleId)
    .order("payout_position", { ascending: true, nullsFirst: true });
    
  if (error) {
    console.error("Error fetching circle members:", error);
    return null;
  }
  
  // Fetch profile data separately for each member
  if (data && data.length > 0) {
    console.log("Fetching profiles for", data.length, "members");
    
    const enrichedMembers = await Promise.all(
      data.map(async (member) => {
        // Get profile data for this member
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", member.user_id)
          .maybeSingle();
          
        if (profileError) {
          console.error("Error fetching profile data for user", member.user_id, ":", profileError);
        }
        
        const displayName = profileData?.display_name || "Unknown User";
        console.log("Profile fetched for user", member.user_id, ":", displayName);
        
        return {
          ...member,
          profiles: {
            display_name: displayName
          }
        };
      })
    );
    
    console.log("Enriched members with profile data:", enrichedMembers.length);
    return enrichedMembers;
  }
  
  return data || [];
}

async function initializeRotation(circleId: string, adminUserId: string): Promise<CircleRotationStatus> {
  console.log("Initializing rotation for circle:", circleId);
  
  // Get circle details
  const circle = await getCircleDetails(circleId);
  if (!circle) {
    throw new Error("Circle not found");
  }
  
  // Get all members
  const members = await getCircleMembers(circleId);
  if (!members || members.length === 0) {
    throw new Error("No members found in circle");
  }
  
  // Verify admin permissions
  const adminMember = members.find(m => m.user_id === adminUserId && m.is_admin);
  if (!adminMember) {
    throw new Error("User is not an admin of this circle");
  }
  
  // Assign payout positions (1, 2, 3, ...)
  const updatedMembers = await Promise.all(
    members.map(async (member, index) => {
      const position = index + 1;
      const nextPayoutDate = position === 1 ? new Date() : null;
      
      // Calculate next payout date based on circle frequency
      if (nextPayoutDate) {
        if (circle.frequency === 'weekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
        } else if (circle.frequency === 'biweekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
        } else {
          nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
        }
      }
      
      const { error: updateError } = await supabase
        .from("circle_members")
        .update({
          payout_position: position,
          next_payout_date: nextPayoutDate?.toISOString() || null
        })
        .eq("id", member.id);
        
      if (updateError) {
        console.error("Error updating member position:", updateError);
        throw updateError;
      }
      
      return {
        ...member,
        payout_position: position,
        next_payout_date: nextPayoutDate?.toISOString() || null
      };
    })
  );
  
  console.log("Rotation initialized for", updatedMembers.length, "members");
  
  return {
    circle_id: circleId,
    total_members: updatedMembers.length,
    current_payout_position: 1,
    next_payout_member: updatedMembers[0]?.user_id || null,
    next_payout_date: updatedMembers[0]?.next_payout_date || null,
    rotation_complete: false,
    members: updatedMembers.map(m => ({
      id: m.id,
      user_id: m.user_id,
      payout_position: m.payout_position,
      next_payout_date: m.next_payout_date,
      display_name: m.profiles?.display_name || "Unknown User",
      is_admin: m.is_admin
    }))
  };
}

async function advanceRotation(circleId: string, adminUserId: string, memberId?: string): Promise<CircleRotationStatus> {
  console.log("Advancing rotation for circle:", circleId);
  
  // Get circle details
  const circle = await getCircleDetails(circleId);
  if (!circle) {
    throw new Error("Circle not found");
  }
  
  // Get all members
  const members = await getCircleMembers(circleId);
  if (!members || members.length === 0) {
    throw new Error("No members found in circle");
  }
  
  // Verify admin permissions
  const adminMember = members.find(m => m.user_id === adminUserId && m.is_admin);
  if (!adminMember) {
    throw new Error("User is not an admin of this circle");
  }
  
  // Find current payout position
  const currentPosition = Math.min(...members.map(m => m.payout_position || 0).filter(p => p > 0));
  const nextPosition = currentPosition + 1;
  const maxPosition = members.length;
  
  // If we've completed a full rotation, reset to position 1
  const newPosition = nextPosition > maxPosition ? 1 : nextPosition;
  
  // Update all members' positions
  const updatedMembers = await Promise.all(
    members.map(async (member) => {
      let newPayoutPosition = member.payout_position;
      let newNextPayoutDate = member.next_payout_date;
      
      if (member.payout_position === currentPosition) {
        // Current payout member gets moved to the end
        newPayoutPosition = maxPosition;
        newNextPayoutDate = null;
      } else if (member.payout_position === newPosition) {
        // Next payout member gets position 1
        newPayoutPosition = 1;
        
        // Calculate next payout date based on frequency
        const nextPayoutDate = new Date();
        if (circle.frequency === 'weekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
        } else if (circle.frequency === 'biweekly') {
          nextPayoutDate.setDate(nextPayoutDate.getDate() + 14);
        } else {
          nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
        }
        newNextPayoutDate = nextPayoutDate.toISOString();
      } else if (member.payout_position > currentPosition) {
        // Members after current position move up by 1
        newPayoutPosition = member.payout_position - 1;
      }
      
      const { error: updateError } = await supabase
        .from("circle_members")
        .update({
          payout_position: newPayoutPosition,
          next_payout_date: newNextPayoutDate
        })
        .eq("id", member.id);
        
      if (updateError) {
        console.error("Error updating member position:", updateError);
        throw updateError;
      }
      
      return {
        ...member,
        payout_position: newPayoutPosition,
        next_payout_date: newNextPayoutDate
      };
    })
  );
  
  console.log("Rotation advanced. New position:", newPosition);
  
  return {
    circle_id: circleId,
    total_members: updatedMembers.length,
    current_payout_position: newPosition,
    next_payout_member: updatedMembers.find(m => m.payout_position === 1)?.user_id || null,
    next_payout_date: updatedMembers.find(m => m.payout_position === 1)?.next_payout_date || null,
    rotation_complete: newPosition === 1, // Complete when we cycle back to position 1
    members: updatedMembers.map(m => ({
      id: m.id,
      user_id: m.user_id,
      payout_position: m.payout_position,
      next_payout_date: m.next_payout_date,
      display_name: m.profiles?.display_name || "Unknown User",
      is_admin: m.is_admin
    }))
  };
}

async function getRotationStatus(circleId: string): Promise<CircleRotationStatus> {
  console.log("Getting rotation status for circle:", circleId);
  
  const members = await getCircleMembers(circleId);
  if (!members || members.length === 0) {
    throw new Error("No members found in circle");
  }
  
  const currentPosition = Math.min(...members.map(m => m.payout_position || 0).filter(p => p > 0));
  const nextPayoutMember = members.find(m => m.payout_position === 1);
  
  return {
    circle_id: circleId,
    total_members: members.length,
    current_payout_position: currentPosition,
    next_payout_member: nextPayoutMember?.user_id || null,
    next_payout_date: nextPayoutMember?.next_payout_date || null,
    rotation_complete: false, // This would need more complex logic to determine
    members: members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      payout_position: m.payout_position,
      next_payout_date: m.next_payout_date,
      display_name: m.profiles?.display_name || "Unknown User",
      is_admin: m.is_admin
    }))
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { circleId, action, adminUserId, memberId } = await req.json() as RotationActionPayload;
    
    if (!circleId || !action) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: circleId and action" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let result: CircleRotationStatus;

    switch (action) {
      case "initialize":
        if (!adminUserId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "adminUserId required for initialize action" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        result = await initializeRotation(circleId, adminUserId);
        break;
        
      case "advance":
        if (!adminUserId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "adminUserId required for advance action" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        result = await advanceRotation(circleId, adminUserId, memberId);
        break;
        
      case "get_status":
        result = await getRotationStatus(circleId);
        break;
        
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Invalid action. Must be 'initialize', 'advance', or 'get_status'" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Track the analytics event
    await supabase.functions.invoke("track-analytics-event", {
      body: {
        event: "circle_rotation_managed",
        user_id: adminUserId || "system",
        properties: {
          circle_id: circleId,
          action: action,
          success: true
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: result,
      message: `Rotation ${action} completed successfully`
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in manage-circle-rotation function:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
