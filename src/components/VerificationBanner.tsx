
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/hooks/useAuthStatus";

export const VerificationBanner = () => {
  const { verificationStatus, isLoading } = useAuthStatus();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (verificationStatus === 'approved') return null;

  return (
    <div className="w-full px-4 py-3 mb-4 rounded-lg shadow-sm border">
      {verificationStatus === 'not_submitted' && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <p className="text-sm font-medium">Your account requires identity verification</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/verify-identity')}
            >
              Verify Now
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-600 ml-7">
            <p>Without verification, you <strong>cannot</strong>:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Create or join savings circles</li>
              <li>Participate in group savings activities</li>
              <li>Access premium features</li>
            </ul>
          </div>
        </div>
      )}

      {verificationStatus === 'submitted' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-sm font-medium">Your verification documents are being reviewed</p>
          </div>
        </div>
      )}

      {verificationStatus === 'rejected' && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm font-medium">Your verification was rejected. Please resubmit your documents.</p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => navigate('/verify-identity')}
            >
              Try Again
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-600 ml-7">
            <p>Common reasons for rejection include:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Document is blurry or unreadable</li>
              <li>Document has expired</li>
              <li>Information doesn't match account details</li>
            </ul>
          </div>
        </div>
      )}

      {verificationStatus === 'expired' && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm font-medium">Your verification was expired. Please resubmit your documents.</p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => navigate('/verify-identity')}
            >
              Try Again
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-600 ml-7">
            <p>Common reasons for rejection include:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Document is blurry or unreadable</li>
              <li>Document has expired</li>
              <li>Information doesn't match account details</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationBanner;
