import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useVeriff } from '@/hooks/useVeriff';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Upload, CheckCircle, AlertCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

const VerifyIdentity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'submitted' | 'approved' | 'rejected'>('pending');

  // Files state
  const [driverLicense, setDriverLicense] = useState<File | null>(null);
  const [secondaryDocument, setSecondaryDocument] = useState<File | null>(null);
  const { uploadIdImage, documentSubmit } = useVeriff();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if user already has verification documents
    const checkVerificationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("user_verifications")
          .select("status")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setVerificationStatus(data.status);
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      }
    };

    checkVerificationStatus();
  }, [user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'driverLicense' | 'secondaryDocument') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should not exceed 5MB");
        return;
      }

      // Validate file type (only images and PDFs)
      if (!file.type.match('image.*') && file.type !== 'application/pdf') {
        toast.error("Only image files and PDFs are allowed");
        return;
      }

      if (type === 'driverLicense') {
        setDriverLicense(file);
      } else {
        setSecondaryDocument(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverLicense) {
      toast.error("Please upload your driver's license");
      return;
    }

    setIsUploading(true);

    try {
      // Upload driver's license
      const { driverLicenseUrl, secondaryDocumentUrl } = await documentSubmit(driverLicense, secondaryDocument);
      if(driverLicenseUrl ==null && secondaryDocumentUrl ==null) {
        toast.error("No documents uploaded.");
        setIsUploading(false);
        return;
      }
      setVerificationStatus('submitted');
      toast.success("Documents submitted successfully! We'll review them shortly.");
    } catch (error) {
      console.error("Error uploading verification documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Record that verification was skipped in the database
      const { error } = await supabase
        .from("user_verifications")
        .insert({
          user_id: user!.id,
          driver_license_url: null,
          secondary_document_url: null,
          status: "not_submitted",
          submitted_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error recording skip verification:", error);
      }

      toast.info("You can complete verification later from your dashboard.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error skipping verification:", error);
      // Navigate to dashboard even if there's an error
      navigate("/dashboard");
    }
  };

  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  const renderContent = () => {
    switch (verificationStatus) {
      // switch ("pending") {
      case 'approved':
        return (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Verification Approved!</h2>
            <p className="text-gray-600 mb-6">Your account has been fully verified.</p>
            <Button onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Verification Rejected</h2>
            <p className="text-gray-600 mb-6">Your verification was not approved. Please try again with clearer documents.</p>
            <Button onClick={() => setVerificationStatus('pending')}>
              Try Again
            </Button>
          </div>
        );

      case 'submitted':
        return (
          <div className="text-center py-8">
            <div className="animate-pulse mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Verification In Progress</h2>
            <p className="text-gray-600 mb-6">
              We've received your documents and our team is reviewing them.
              This usually takes 1-2 business days.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Continue to Dashboard
            </Button>
          </div>
        );

      default:
        return (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Verification is recommended</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You can skip verification for now, but you won't be able to create or join savings circles until your identity is verified.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="license">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="license">Driver's License</TabsTrigger>
                  <TabsTrigger value="secondary">Secondary ID</TabsTrigger>
                </TabsList>

                <TabsContent value="license" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="driverLicense">Upload your driver's license (Required)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-primary transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        JPG, PNG or PDF (max. 5MB)
                      </p>
                      <Input
                        id="driverLicense"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'driverLicense')}
                        accept="image/*,.pdf"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('driverLicense')?.click()}
                        className="mt-4"
                      >
                        Select File
                      </Button>
                    </div>
                    {driverLicense && (
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" /> {driverLicense.name}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="secondary" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryDocument">Upload a secondary ID document (Optional)</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Such as a passport, ID card, utility bill, or bank statement
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-primary transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        JPG, PNG or PDF (max. 5MB)
                      </p>
                      <Input
                        id="secondaryDocument"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, 'secondaryDocument')}
                        accept="image/*,.pdf"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('secondaryDocument')?.click()}
                        className="mt-4"
                      >
                        Select File
                      </Button>
                    </div>
                    {secondaryDocument && (
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" /> {secondaryDocument.name}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium text-gray-800 mb-2">Why do we need this?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We require identity verification to ensure the security of our platform and comply with financial regulations.
                  Your documents are stored securely and handled in accordance with our privacy policy.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!driverLicense || isUploading}
                  >
                    {isUploading ? "Uploading..." : "Submit Documents"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkip}
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            </form>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
          <CardDescription>Please upload your identification documents to verify your account</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4 mt-4">
          <p className="text-xs text-center text-gray-500">
            Your documents are encrypted and stored securely. We respect your privacy and handle your data in accordance with our privacy policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyIdentity;
