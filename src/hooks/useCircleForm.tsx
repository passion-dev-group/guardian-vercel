
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

// Define form schema with zod
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Circle name must be at least 3 characters.",
  }),
  amount: z.coerce.number().positive({
    message: "Contribution amount must be greater than 0.",
  }),
  frequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"], {
    required_error: "Please select a contribution frequency.",
  }),
  startDate: z.string().optional(),
  minMembers: z.coerce.number().min(2, {
    message: "Minimum members must be at least 2.",
  }).max(50, {
    message: "Minimum members cannot exceed 50.",
  }).optional(),
  maxMembers: z.coerce.number().min(2, {
    message: "Maximum members must be at least 2.",
  }).max(50, {
    message: "Maximum members cannot exceed 50.",
  }).optional(),
  membersEmails: z.array(
    z.string().email({ message: "Please enter a valid email address." })
  ).optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions to create a circle."
  })
}).refine(data => {
  if (data.minMembers && data.maxMembers && data.minMembers > data.maxMembers) {
    return false;
  }
  return true;
}, {
  message: "Minimum members cannot be greater than maximum members.",
  path: ["maxMembers"]
});

export type CircleFormValues = z.infer<typeof formSchema>;

export const useCircleForm = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Initialize form
  const form = useForm<CircleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: undefined,
      frequency: "monthly",
      startDate: "",
      minMembers: 2,
      maxMembers: 10,
      membersEmails: [],
      acceptTerms: false,
    },
  });

  // Track page view on component mount
  useEffect(() => {
    trackEvent('create_circle_viewed');
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    if (!user || !session) {
      toast.error("You must be logged in to create a circle");
      navigate("/login");
    }
  }, [user, session, navigate]);

  const addMember = (email: string) => {
    // Basic email validation before adding to list
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email) && !members.includes(email)) {
      setMembers([...members, email]);
      return true;
    } else {
      toast.error("Please enter a valid email address that hasn't been added yet.");
      trackEvent('create_circle_validation_error', { field: 'member_email' });
      return false;
    }
  };

  const removeMember = (email: string) => {
    setMembers(members.filter(m => m !== email));
  };

  const generateInviteLink = () => {
    if (!form.getValues("name")) {
      toast.error("Please enter a circle name first");
      return;
    }
    
    // In a real implementation, this would be the actual invite link from the database
    const mockInviteCode = Math.random().toString(36).substring(2, 10);
    const baseUrl = window.location.origin;
    setInviteLink(`${baseUrl}/join-circle?code=${mockInviteCode}`);
    
    trackEvent('invite_link_generated');
  };

  // Handle terms acceptance
  const handleTermsAccept = () => {
    setTermsAccepted(true);
    form.setValue('acceptTerms', true);
  };

  const handleTermsDecline = () => {
    setTermsAccepted(false);
    form.setValue('acceptTerms', false);
  };

  // Handle form submission
  const onSubmit = async (values: CircleFormValues) => {
    if (!user) {
      toast.error("You must be logged in to create a circle");
      navigate("/login");
      return;
    }

    if (!termsAccepted) {
      toast.error("You must accept the terms and conditions to create a circle");
      return;
    }

    setIsSubmitting(true);
    trackEvent('create_circle_submitted', {
      frequency: values.frequency,
      memberCount: members.length
    });

    try {
      console.log("Creating circle with user ID:", user.id);
      
      // Insert the new circle into the database
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .insert({
          name: values.name,
          contribution_amount: values.amount,
          frequency: values.frequency,
          created_by: user.id,
          start_date: values.startDate || null,
          min_members: values.minMembers || 2,
          max_members: values.maxMembers || 10,
          status: 'pending', // Set initial status to pending
        })
        .select('id')
        .single();

      if (circleError) {
        console.error("Circle creation error details:", circleError);
        toast.error(`Failed to create circle: ${circleError.message}`);
        setIsSubmitting(false);
        return;
      }

      console.log("Circle created successfully:", circleData);
      
      // Generate a unique invite code for the circle
      const inviteCode = Math.random().toString(36).substring(2, 10);
      const circleId = circleData.id;

      // Insert the invite information
      const { error: inviteError } = await supabase
        .from('circle_invites')
        .insert({
          circle_id: circleId,
          invite_code: inviteCode,
          created_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week expiry
        });

      if (inviteError) {
        console.error("Invite creation error:", inviteError);
        // Continue anyway, we've created the circle
      }

      // Add the current user as a member and admin of the circle
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: user.id,
          is_admin: true,
          payout_position: 1 // Creator is first in line
        });

      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        // Continue anyway, we've created the circle
      }

      // Send invites to all members
      if (members.length > 0) {
        const memberInvites = members.map(email => ({
          circle_id: circleId,
          email: email,
          invite_code: inviteCode,
          invited_by: user.id,
          status: 'pending',
        }));

        const { error: memberInviteError } = await supabase
          .from('circle_members_invites')
          .insert(memberInvites);

        if (memberInviteError) {
          console.error("Error inviting members:", memberInviteError);
          // Continue anyway, we've created the circle
        } else {
          // Send invitation emails using the Supabase function
          try {
            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-circle-invitation', {
              body: {
                circleId: circleId,
                invitedBy: user.id,
                recipients: members.map(email => ({ email }))
              }
            });

            if (emailError) {
              console.error("Error sending invitation emails:", emailError);
            } else {
              console.log("Invitation emails sent:", emailResult);
              const successfulEmails = emailResult?.sent || 0;
              const failedEmails = emailResult?.failed || 0;
              
              if (successfulEmails > 0) {
                toast.success(`Circle created! ${successfulEmails} invitation${successfulEmails > 1 ? 's' : ''} sent.`);
              }
              
              if (failedEmails > 0) {
                toast.error(`${failedEmails} invitation${failedEmails > 1 ? 's' : ''} failed to send.`);
              }
            }
          } catch (emailError) {
            console.error("Error calling send-circle-invitation function:", emailError);
          }
        }
      }

      // Set the invite link that can be shared
      const baseUrl = window.location.origin;
      const fullInviteLink = `${baseUrl}/join-circle?code=${inviteCode}`;
      setInviteLink(fullInviteLink);

      toast.success("Circle created successfully!");
      
      // Wait a moment to show the success message, then navigate
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error("Error creating circle:", error);
      toast.error(`Failed to create circle: ${error?.message || "Unknown error"}`);
      trackEvent('create_circle_error', { error: JSON.stringify(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to create circle and return the circle ID
  const createCircleAndGetId = async (values: CircleFormValues): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to create a circle");
      return null;
    }

    if (!termsAccepted) {
      toast.error("You must accept the terms and conditions to create a circle");
      return null;
    }

    try {
      console.log("Creating circle with user ID:", user.id);
      
      // Insert the new circle into the database
      const { data: circleData, error: circleError } = await supabase
        .from('circles')
        .insert({
          name: values.name,
          contribution_amount: values.amount,
          frequency: values.frequency,
          created_by: user.id,
          start_date: values.startDate || null,
          min_members: values.minMembers || 2,
          max_members: values.maxMembers || 10,
          status: 'pending', // Set initial status to pending
        })
        .select('id')
        .single();

      if (circleError) {
        console.error("Circle creation error details:", circleError);
        toast.error(`Failed to create circle: ${circleError.message}`);
        return null;
      }

      console.log("Circle created successfully:", circleData);
      const circleId = circleData.id;
      
      // Add the current user as a member and admin of the circle
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: user.id,
          is_admin: true,
          payout_position: 1 // Creator is first in line
        });

      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        // Continue anyway, we've created the circle
      }

      return circleId;
    } catch (error: any) {
      console.error("Error creating circle:", error);
      toast.error(`Failed to create circle: ${error?.message || "Unknown error"}`);
      return null;
    }
  };

  return {
    form,
    isSubmitting,
    inviteLink,
    members,
    termsAccepted,
    addMember,
    removeMember,
    generateInviteLink,
    handleTermsAccept,
    handleTermsDecline,
    onSubmit,
    setInviteLink,
    createCircleAndGetId,
  };
};
