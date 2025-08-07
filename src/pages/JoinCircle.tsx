
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CircleOverview from "@/components/circle/CircleOverview";
import AuthGuard from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { ContactsPicker } from "@/components/contacts/ContactsPicker";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const JoinCircle = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '');
  const [isJoining, setIsJoining] = useState(false);
  
  const handleContinue = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    
    setIsJoining(true);
    trackEvent('join_circle_continue_clicked', { has_code: Boolean(inviteCode) });
    console.log('inviteCode', inviteCode);  
    try {
      // Validate the invite code against the database
      const { data, error } = await supabase
        .from('circle_invites')
        .select('circle_id, expires_at, created_by')
        .eq('invite_code', inviteCode)
        .single();
      
      if (error) {
        throw new Error('Invalid or expired invite code');
      }
      
      // Check if invite has expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Invite code has expired');
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Check if user is already a member of this circle
      const { data: existingMember } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', data.circle_id)
        .eq('user_id', user.id)
        .single();
      
      if (existingMember) {
        // User is already a member, just redirect
        toast.success('You are already a member of this circle');
        navigate(`/circles/${data.circle_id}`);
        return;
      }
      
      // Add user as a member of the circle
      const { error: memberError } = await supabase
        .from('circle_members')
        .insert({
          circle_id: data.circle_id,
          user_id: user.id,
          is_admin: false,
          payout_position: null // Will be assigned by admin or system
        });
      
      if (memberError) {
        console.error('Error adding user to circle:', memberError);
        throw new Error('Failed to join circle');
      }
      
      toast.success('Successfully joined the circle!');
      
      // Redirect to the circle details page
      navigate(`/circles/${data.circle_id}`);
    } catch (error: any) {
      console.error('Error joining circle:', error);
      toast.error(error.message || 'Invalid or expired invite code');
    } finally {
      setIsJoining(false);
    }
  };

  const handleInvitesSent = () => {
    toast.success("Invitations sent successfully!");
  };
  
  return (
    <AuthGuard>
      <div className="container max-w-3xl py-10 space-y-8">
        <Tabs defaultValue="join">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join Circle</TabsTrigger>
            <TabsTrigger value="invite">Invite Friends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="join" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Join a Savings Circle</CardTitle>
                <CardDescription>
                  Enter the invite code you received to join an existing savings circle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="inviteCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Invite Code
                    </label>
                    <input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter your invite code"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-sm text-muted-foreground">
                      This code was shared with you by the circle administrator.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleContinue} 
                    className="w-full"
                    disabled={isJoining}
                  >
                    {isJoining ? "Joining..." : "Continue"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="invite" className="space-y-4 pt-4">
            <ContactsPicker onInvitesSent={handleInvitesSent} />
          </TabsContent>
        </Tabs>
        
        <CircleOverview />
      </div>
    </AuthGuard>
  );
};

export default JoinCircle;
