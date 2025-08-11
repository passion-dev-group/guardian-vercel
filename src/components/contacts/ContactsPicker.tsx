
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ContactsList } from './ContactsList';
import { useContacts } from '@/hooks/useContacts';
import { UserPlus, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ContactsPickerProps {
  circleId?: string;
  onInvitesSent?: () => void;
}

export const ContactsPicker: React.FC<ContactsPickerProps> = ({ 
  circleId,
  onInvitesSent 
}) => {
  const {
    matchedContacts,
    unmatchedContacts,
    loading,
    error,
    loadContacts,
    isContactsApiAvailable,
    permissionGranted,
    toggleContactSelection,
    getSelectedContacts,
    sendInvites
  } = useContacts();
  
  const [isSending, setIsSending] = useState(false);
  
  const handleLoadContacts = () => {
    loadContacts();
  };
  
  const handleSendInvites = async () => {
    setIsSending(true);
    try {
      const selectedContacts = getSelectedContacts();
      
      if (selectedContacts.length === 0) {
        toast.error("Please select at least one contact to invite");
        return;
      }
      
      const result = await sendInvites(circleId);
      
      if (result.success) {
        toast.success(`Successfully sent ${selectedContacts.length} invitation(s)`);
        if (onInvitesSent) {
          onInvitesSent();
        }
      } else {
        toast.error(`Failed to send invitations: ${result.error}`);
      }
    } catch (err) {
      console.error("Error sending invites:", err);
      toast.error("Something went wrong while sending invitations");
    } finally {
      setIsSending(false);
    }
  };
  
  // Show different states based on API availability and permissions
  if (!isContactsApiAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Access Unavailable</CardTitle>
          <CardDescription>
            Your browser doesn't support contact picker functionality.
            Try using a mobile device with Chrome or Safari.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can still invite people by entering their email addresses manually.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Show loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">Loading your contacts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show permission request or contacts picker
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span>Contacts</span>
        </CardTitle>
        <CardDescription>
          Invite people to join MiTurn from your contacts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissionGranted === false && (
          <div className="text-center py-6">
            <p className="mb-4">We need permission to access your contacts.</p>
            <Button onClick={handleLoadContacts}>
              Access Contacts
            </Button>
          </div>
        )}
        
        {permissionGranted === true && matchedContacts.length === 0 && unmatchedContacts.length === 0 && (
          <div className="text-center py-6">
            <p className="mb-4">No contacts were loaded or found.</p>
            <Button onClick={handleLoadContacts}>
              Try Again
            </Button>
          </div>
        )}
        
        {permissionGranted === null && (
          <div className="text-center py-6">
            <Button onClick={handleLoadContacts} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Access My Contacts
            </Button>
          </div>
        )}
        
        {error && (
          <div className="text-center py-3 text-destructive">
            <p>Error: {error.message}</p>
            <Button 
              variant="outline" 
              onClick={handleLoadContacts}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {(matchedContacts.length > 0 || unmatchedContacts.length > 0) && (
          <div className="space-y-6">
            {matchedContacts.length > 0 && (
              <ContactsList
                title="Already on MiTurn"
                contacts={matchedContacts}
                onToggleSelect={toggleContactSelection}
                emptyMessage="None of your contacts are on MiTurn yet"
              />
            )}
            
            {unmatchedContacts.length > 0 && (
              <ContactsList
                title="Invite to MiTurn"
                contacts={unmatchedContacts}
                onToggleSelect={toggleContactSelection}
                emptyMessage="No contacts to invite"
              />
            )}
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSendInvites}
                disabled={getSelectedContacts().length === 0 || isSending}
              >
                {isSending ? "Sending..." : "Send Invites"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
