
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Phone, Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface Member {
  id: string;
  phone?: string;
  email?: string;
  status: 'pending' | 'sent' | 'failed';
}

interface EnhancedMemberInvitationProps {
  members: Member[];
  addMember: (member: { phone?: string; email?: string }) => boolean;
  removeMember: (id: string) => void;
  sendInvites: (members: Member[]) => Promise<void>;
}

const EnhancedMemberInvitation = ({ 
  members, 
  addMember, 
  removeMember,
  sendInvites 
}: EnhancedMemberInvitationProps) => {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const validatePhone = (value: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!value) return "Phone number is required";
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return "Please enter a valid phone number";
    }
    return "";
  };

  const validateEmail = (value: string) => {
    if (!value) return ""; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const error = validatePhone(value);
    setPhoneError(error);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const error = validateEmail(value);
    setEmailError(error);
  };

  const handleAddMember = () => {
    const phoneErr = validatePhone(phone);
    const emailErr = validateEmail(email);
    
    setPhoneError(phoneErr);
    setEmailError(emailErr);

    if (phoneErr) return;
    if (email && emailErr) return;

    const memberData = {
      phone: phone.trim(),
      ...(email.trim() && { email: email.trim() })
    };

    if (addMember(memberData)) {
      setPhone("");
      setEmail("");
      setPhoneError("");
      setEmailError("");
      
      // Track analytics events
      trackEvent('invite_phone_added', { phone_provided: true });
      if (email) {
        trackEvent('invite_email_added', { email_provided: true });
      }
    }
  };

  const handleSendInvites = async () => {
    if (members.length === 0) return;
    
    setIsSending(true);
    try {
      await sendInvites(members);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: Member['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Invite Members</h3>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAddMember();
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="phone-input" className="text-sm font-medium">
              Phone Number (required)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone-input"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`pl-10 ${phoneError ? 'border-red-500' : ''}`}
                aria-describedby={phoneError ? "phone-error" : undefined}
                aria-invalid={!!phoneError}
                required
              />
            </div>
            {phoneError && (
              <p id="phone-error" className="text-sm text-red-500" role="alert">
                {phoneError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-input" className="text-sm font-medium">
              Email (optional)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email-input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={!!emailError}
              />
            </div>
            {emailError && (
              <p id="email-error" className="text-sm text-red-500" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            variant="outline"
            disabled={!phone || !!phoneError || (email && !!emailError)}
          >
            Add Member
          </Button>
        </form>
      </div>

      {members.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-muted-foreground">
              Invited Members ({members.length})
            </h4>
            <Button 
              onClick={handleSendInvites}
              disabled={isSending || members.length === 0}
              size="sm"
            >
              {isSending ? "Sending..." : "Send All Invites"}
            </Button>
          </div>
          
          <div className="space-y-2">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between bg-muted p-3 rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(member.status)}
                    <div>
                      <p className="text-sm font-medium">{member.phone}</p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember(member.id)}
                  aria-label={`Remove ${member.phone}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMemberInvitation;
