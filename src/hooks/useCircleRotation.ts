import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";

interface RotationActionParams {
  circleId: string;
  action: "initialize" | "advance" | "get_status";
  memberId?: string;
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

export const useCircleRotation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rotationStatus, setRotationStatus] = useState<CircleRotationStatus | null>(null);
  const { toast } = useToast();

  const manageRotation = async ({ 
    circleId, 
    action, 
    memberId 
  }: RotationActionParams) => {
    setIsLoading(true);
    
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("manage-circle-rotation", {
        body: {
          circleId,
          action,
          adminUserId: action !== "get_status" ? user.id : undefined,
          memberId
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        // Update local state with rotation status
        setRotationStatus(data.data);
        
        // Show success message
        const actionText = action === "initialize" ? "initialized" : 
                          action === "advance" ? "advanced" : "retrieved";
        toast({
          title: "Rotation updated",
          description: `Circle rotation ${actionText} successfully`,
        });

        // Track the event
        trackEvent('circle_rotation_managed', {
          circle_id: circleId,
          action: action,
          success: true
        });

        return { success: true, data: data.data };
      } else {
        throw new Error(data?.error || "Failed to manage rotation");
      }

    } catch (error) {
      console.error("Error managing circle rotation:", error);
      
      toast({
        title: "Rotation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });

      // Track the failed event
      trackEvent('circle_rotation_failed', {
        circle_id: circleId,
        action: action,
        error: error instanceof Error ? error.message : "Unknown error"
      });

      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const initializeRotation = async (circleId: string) => {
    return manageRotation({ circleId, action: "initialize" });
  };

  const advanceRotation = async (circleId: string, memberId?: string) => {
    return manageRotation({ circleId, action: "advance", memberId });
  };

  const getRotationStatus = async (circleId: string) => {
    return manageRotation({ circleId, action: "get_status" });
  };

  return {
    manageRotation,
    initializeRotation,
    advanceRotation,
    getRotationStatus,
    isLoading,
    rotationStatus,
    setRotationStatus
  };
};
