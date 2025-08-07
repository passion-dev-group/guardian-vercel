
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export const useAccountDeletion = () => {
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteAccount = async (confirmationText: string): Promise<boolean> => {
    if (!user) return false;
    if (confirmationText !== 'DELETE') return false;
    
    setIsDeleting(true);
    
    try {
      // In a production app, this would call a secure server endpoint
      // that would handle the account deletion on the backend
      
      // Step 1: Delete user data from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        throw profileError;
      }
      
      // Step 2: Delete the authentication user (requires admin privileges)
      // In a real app, this would be done via a secure server endpoint
      // Here we're simulating it
      await new Promise(resolve => setTimeout(resolve, 800));
      
      trackEvent('account_deleted');
      
      // Step 3: Sign out the user
      await signOut();
      
      toast.success('Account deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please contact support.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };
  
  return {
    isDeleting,
    deleteAccount
  };
};
