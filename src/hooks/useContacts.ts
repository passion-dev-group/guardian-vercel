
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';

export interface Contact {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  matched?: boolean;
  userId?: string;
  selected?: boolean;
}

interface ContactsState {
  contacts: Contact[];
  matchedContacts: Contact[];
  unmatchedContacts: Contact[];
  loading: boolean;
  error: Error | null;
}

export function useContacts() {
  const { user } = useAuth();
  const [state, setState] = useState<ContactsState>({
    contacts: [],
    matchedContacts: [],
    unmatchedContacts: [],
    loading: false,
    error: null
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Check if contacts API is available
  const isContactsApiAvailable = 
    typeof navigator !== 'undefined' && 
    'contacts' in navigator && 
    'ContactsManager' in window;

  // Request contact permissions
  const requestPermission = useCallback(async () => {
    if (!isContactsApiAvailable) {
      setPermissionGranted(false);
      return false;
    }

    try {
      const props = ['name', 'email', 'tel'];
      const options = { multiple: true };
      
      // Request permission to access contacts
      const permission = await navigator.permissions.query({ name: 'contacts' as any });
      
      if (permission.state === 'granted') {
        setPermissionGranted(true);
        return true;
      } else if (permission.state === 'prompt') {
        // This will trigger the permission prompt
        await (navigator as any).contacts.select(props, options);
        setPermissionGranted(true);
        return true;
      } else {
        setPermissionGranted(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      setPermissionGranted(false);
      return false;
    }
  }, [isContactsApiAvailable]);

  // Fetch contacts from device
  const fetchDeviceContacts = useCallback(async () => {
    if (!isContactsApiAvailable) {
      return [];
    }

    try {
      const props = ['name', 'email', 'tel'];
      const options = { multiple: true };
      
      const contacts = await (navigator as any).contacts.select(props, options);
      
      // Track analytics
      trackEvent('contacts_viewed', { count: contacts.length });
      
      return contacts.map((contact: any, index: number) => ({
        id: `device-contact-${index}`,
        name: contact.name?.join(', ') || 'Unknown',
        email: contact.email?.[0] || null,
        phone: contact.tel?.[0] || null,
        selected: false
      }));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }, [isContactsApiAvailable]);

  // Match contacts with existing users
  const matchContacts = useCallback(async (contacts: Contact[]) => {
    try {
      // Extract emails and phones for matching
      const emails = contacts
        .filter(contact => contact.email)
        .map(contact => contact.email as string);
      
      const phones = contacts
        .filter(contact => contact.phone)
        .map(contact => contact.phone as string);
        
      if (emails.length === 0 && phones.length === 0) {
        return { matched: [], unmatched: [] };
      }
      
      // Call the match_contacts RPC function
      const { data, error } = await supabase.rpc('match_contacts', {
        contact_emails: emails,
        contact_phones: phones
      });
      
      if (error) throw error;
      
      // Update contact objects with match status
      const updatedContacts = contacts.map(contact => {
        const matchData = data.find(match => 
          (contact.email && match.email === contact.email) || 
          (contact.phone && match.phone === contact.phone)
        );
        
        return {
          ...contact,
          matched: matchData?.matched ?? false,
          userId: matchData?.user_id
        };
      });
      
      // Split into matched and unmatched
      const matched = updatedContacts.filter(c => c.matched);
      const unmatched = updatedContacts.filter(c => !c.matched);
      
      return { matched, unmatched };
    } catch (error) {
      console.error('Error matching contacts:', error);
      throw error;
    }
  }, []);

  // Load contacts with permission check
  const loadContacts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Check permission first
      const hasPermission = await requestPermission();
      
      if (!hasPermission) {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          error: new Error('Contact permission denied')
        }));
        return;
      }
      
      const deviceContacts = await fetchDeviceContacts();
      
      if (deviceContacts.length > 0) {
        // Match contacts with existing users
        const { matched, unmatched } = await matchContacts(deviceContacts);
        
        setState({
          contacts: deviceContacts,
          matchedContacts: matched,
          unmatchedContacts: unmatched,
          loading: false,
          error: null
        });
      } else {
        setState({
          contacts: [],
          matchedContacts: [],
          unmatchedContacts: [],
          loading: false,
          error: new Error('No contacts found')
        });
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: error as Error
      }));
    }
  }, [requestPermission, fetchDeviceContacts, matchContacts]);

  // Toggle contact selection
  const toggleContactSelection = useCallback((contactId: string) => {
    setState(prev => {
      const updatedContacts = prev.contacts.map(contact => 
        contact.id === contactId 
          ? { ...contact, selected: !contact.selected } 
          : contact
      );
      
      return {
        ...prev,
        contacts: updatedContacts,
        matchedContacts: updatedContacts.filter(c => c.matched && c.selected !== undefined),
        unmatchedContacts: updatedContacts.filter(c => !c.matched && c.selected !== undefined)
      };
    });
    
    // Track selection event
    trackEvent('contact_selected', { contact_id: contactId });
  }, []);

  // Get selected contacts
  const getSelectedContacts = useCallback(() => {
    return state.contacts.filter(contact => contact.selected);
  }, [state.contacts]);

  // Send invitations to selected contacts
  const sendInvites = useCallback(async (circleId?: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      const selectedContacts = getSelectedContacts();
      
      if (selectedContacts.length === 0) {
        return { success: false, error: 'No contacts selected' };
      }
      
      // Separate email and phone contacts
      const emailContacts = selectedContacts.filter(contact => contact.email);
      const phoneContacts = selectedContacts.filter(contact => contact.phone && !contact.email);
      
      let results = { success: true, data: { sent: 0, failed: 0, results: [] } };
      
      // Send email invitations if we have a circle ID and email contacts
      if (circleId && emailContacts.length > 0) {
        const emailResponse = await supabase.functions.invoke('send-circle-invitation', {
          body: {
            circleId,
            invitedBy: user.id,
            recipients: emailContacts.map(contact => ({
              email: contact.email!,
              name: contact.name
            }))
          }
        });
        
        if (emailResponse.error) {
          console.error('Error sending email invitations:', emailResponse.error);
        } else {
          results.data.sent += emailResponse.data?.sent || 0;
          results.data.failed += emailResponse.data?.failed || 0;
          results.data.results.push(...(emailResponse.data?.results || []));
        }
      }
      
      // Send SMS invitations for phone contacts (using the old function for now)
      if (phoneContacts.length > 0) {
        const smsResponse = await supabase.functions.invoke('send-invitation', {
          body: {
            userId: user.id,
            circleId,
            recipients: phoneContacts.map(contact => ({
              email: contact.email,
              phone: contact.phone,
              matched: contact.matched,
              userId: contact.userId
            }))
          }
        });
        
        if (smsResponse.error) {
          console.error('Error sending SMS invitations:', smsResponse.error);
        } else {
          // Add SMS results to the overall results
          const smsData = smsResponse.data;
          if (smsData) {
            results.data.sent += smsData.sent || 0;
            results.data.failed += smsData.failed || 0;
            results.data.results.push(...(smsData.results || []));
          }
        }
      }
      
      // Track invites sent
      trackEvent('invite_sent', { 
        count: selectedContacts.length,
        circle_id: circleId || null
      });
      
      return results;
    } catch (error) {
      console.error('Error sending invites:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [user, getSelectedContacts]);

  return {
    ...state,
    loadingMore,
    permissionGranted,
    isContactsApiAvailable,
    loadContacts,
    requestPermission,
    toggleContactSelection,
    getSelectedContacts,
    sendInvites
  };
}
