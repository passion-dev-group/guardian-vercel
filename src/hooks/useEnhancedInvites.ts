
import { useState } from 'react';
import { useEdgeFunction } from '@/hooks/useEdgeFunction';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface Member {
  id: string;
  phone?: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed';
}

interface SMSResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const useEnhancedInvites = (circleId?: string, circleName?: string) => {
  const [members, setMembers] = useState<Member[]>([]);
  const { callFunction: sendSMS } = useEdgeFunction<SMSResponse>();
  const { callFunction: sendEmail } = useEdgeFunction();

  const addMember = (memberData: { phone?: string; email?: string }) => {
    // Check for duplicates
    const isDuplicate = members.some(m => 
      m.phone === memberData.phone || 
      (memberData.email && m.email === memberData.email)
    );

    if (isDuplicate) {
      toast.error("This member has already been added");
      return false;
    }

    const newMember: Member = {
      id: Math.random().toString(36).substring(2, 10),
      ...memberData,
      status: 'pending'
    };

    setMembers(prev => [...prev, newMember]);
    return true;
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const sendInvites = async (membersToSend: Member[]) => {
    const results = await Promise.allSettled(
      membersToSend.map(async (member) => {
        try {
          // Update status to sending
          setMembers(prev => prev.map(m => 
            m.id === member.id ? { ...m, status: 'pending' as const } : m
          ));

          // Send SMS invite
          if (member.phone) {
            const smsResult = await sendSMS({
              functionName: 'send-sms-invite',
              body: {
                phone: member.phone,
                circleId: circleId || '',
                circleName: circleName || 'Savings Circle',
                inviterName: 'User' // Replace with actual user name
              }
            });

            if (smsResult && smsResult.success) {
              trackEvent('invite_sent_sms', { phone: member.phone });
            } else {
              throw new Error(smsResult?.error || 'SMS sending failed');
            }
          }

          // Send email invite if email provided
          if (member.email) {
            // For now, we'll simulate email sending
            // In production, integrate with SendGrid or similar service
            console.log(`Email invite would be sent to ${member.email}`);
            trackEvent('invite_sent_email', { email: member.email });
          }

          // Update status to sent
          setMembers(prev => prev.map(m => 
            m.id === member.id ? { ...m, status: 'sent' as const } : m
          ));

          return { success: true, member };
        } catch (error) {
          console.error(`Failed to send invite to ${member.phone || member.email}:`, error);
          
          // Update status to failed
          setMembers(prev => prev.map(m => 
            m.id === member.id ? { ...m, status: 'failed' as const } : m
          ));

          return { success: false, member, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    if (successful > 0) {
      toast.success(`Successfully sent ${successful} invite${successful > 1 ? 's' : ''}`);
    }
    
    if (failed > 0) {
      toast.error(`Failed to send ${failed} invite${failed > 1 ? 's' : ''}`);
    }
  };

  return {
    members,
    addMember,
    removeMember,
    sendInvites
  };
};
