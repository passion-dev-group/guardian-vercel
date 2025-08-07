
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

interface VerificationStepProps {
  institutionName: string;
  verificationType: "microdeposit" | "instant";
  onVerificationComplete: () => void;
}

const VerificationStep = ({ 
  institutionName, 
  verificationType, 
  onVerificationComplete 
}: VerificationStepProps) => {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = () => {
    setIsVerifying(true);
    trackEvent('verification_requested', { 
      institution: institutionName,
      verification_type: verificationType 
    });
    
    // Simulate verification process
    setTimeout(() => {
      setIsVerifying(false);
      onVerificationComplete();
      toast.success("Account verified successfully!");
    }, 2000);
  };

  return (
    <div className="bg-muted/50 p-6 rounded-lg border">
      <h3 className="text-lg font-medium mb-2">Verify Your Account</h3>
      
      {verificationType === "microdeposit" ? (
        <div className="space-y-4">
          <p>
            We've sent two small deposits to your account at {institutionName}. These will appear 
            in 1-3 business days. Once you see them, return here to verify your account.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Check your account for two small deposits (less than $1.00 each)</li>
            <li>Return to this page to enter the exact amounts</li>
            <li>Your account will be verified immediately</li>
          </ol>
        </div>
      ) : (
        <p>
          Your account at {institutionName} requires instant verification. Click the button below
          to securely log into your bank and verify your account.
        </p>
      )}
      
      <Button 
        onClick={handleVerify} 
        className="mt-4" 
        disabled={isVerifying}
      >
        {isVerifying ? "Verifying..." : "Verify Now"}
      </Button>
    </div>
  );
};

export default VerificationStep;
