
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type VerificationStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'not_submitted' | 'expired' | 'declined';

export const useAuthStatus = () => {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_submitted');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user verification record exists
        const { data, error } = await supabase
          .from('user_verifications')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();  // Use maybeSingle instead of single to avoid errors

        if (error) {
          console.error('Error checking verification status:', error);
          setVerificationStatus('not_submitted');
          setIsVerified(false);
          setIsLoading(false);
          return;
        }

        if (data) {
          setVerificationStatus(data.status as VerificationStatus);
          setIsVerified(data.status === 'approved');
        } else {
          setVerificationStatus('not_submitted');
          setIsVerified(false);
        }
      } catch (error) {
        console.error('Error in verification check:', error);
        // Set default values in case of error
        setVerificationStatus('not_submitted');
        setIsVerified(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user]);

  return {
    isVerified,
    verificationStatus,
    isLoading
  };
};
