
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Search, FileText } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

type VerificationDocument = {
  id: string;
  user_id: string;
  driver_license_url: string;
  secondary_document_url: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  submitted_at: string;
  updated_at: string | null;
  user_email?: string;
  user_name?: string;
};

const VerificationReview = () => {
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDocumentUrls, setViewDocumentUrls] = useState<{license: string, secondary: string | null} | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VerificationDocument | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationDocuments();
  }, []);

  const fetchVerificationDocuments = async () => {
    try {
      setLoading(true);
      
      // Get verification documents and join with profiles for user information
      const { data, error } = await supabase
        .from("user_verifications")
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = data.map((item: any) => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.display_name,
      }));

      setDocuments(formattedData);
    } catch (error) {
      console.error("Error fetching verification documents:", error);
      toast.error("Failed to fetch verification documents");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = (document: VerificationDocument) => {
    setViewDocumentUrls({
      license: document.driver_license_url,
      secondary: document.secondary_document_url
    });
    setSelectedDocument(document);
  };

  const handleApproveVerification = async (id: string) => {
    try {
      setProcessingId(id);
      
      const { error } = await supabase
        .from("user_verifications")
        .update({
          status: "approved",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Update local state
      setDocuments(documents.map(doc => 
        doc.id === id ? { ...doc, status: "approved", updated_at: new Date().toISOString() } : doc
      ));
      
      toast.success("Verification approved successfully");
      setViewDocumentUrls(null);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error approving verification:", error);
      toast.error("Failed to approve verification");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectVerification = async (id: string) => {
    try {
      setProcessingId(id);
      
      const { error } = await supabase
        .from("user_verifications")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Update local state
      setDocuments(documents.map(doc => 
        doc.id === id ? { ...doc, status: "rejected", updated_at: new Date().toISOString() } : doc
      ));
      
      toast.success("Verification rejected");
      setViewDocumentUrls(null);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast.error("Failed to reject verification");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Verification Documents</h2>
        <Button onClick={fetchVerificationDocuments}>Refresh</Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-900">No documents to review</h3>
          <p className="mt-1 text-sm text-gray-500">
            When users submit verification documents, they will appear here.
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{doc.user_name || "Unknown"}</p>
                      <p className="text-sm text-gray-500">{doc.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.status === "submitted" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                    {doc.status === "approved" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                    {doc.status === "rejected" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(doc.submitted_at)}</TableCell>
                  <TableCell>{doc.updated_at ? formatDate(doc.updated_at) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDocuments(doc)}
                    >
                      <Search className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewDocumentUrls} onOpenChange={() => {
        setViewDocumentUrls(null);
        setSelectedDocument(null);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription>
              Reviewing documents for {selectedDocument?.user_name || "User"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="space-y-2">
              <h3 className="font-medium">Driver's License</h3>
              <div className="border rounded-md overflow-hidden aspect-[3/2] bg-gray-100 flex items-center justify-center">
                {viewDocumentUrls?.license.endsWith('.pdf') ? (
                  <a 
                    href={viewDocumentUrls?.license} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-blue-500 hover:text-blue-700"
                  >
                    <FileText className="h-12 w-12" />
                    <span className="mt-2">View PDF</span>
                  </a>
                ) : (
                  <img 
                    src={viewDocumentUrls?.license} 
                    alt="Driver's License" 
                    className="max-h-full object-contain"
                  />
                )}
              </div>
            </div>
            
            {viewDocumentUrls?.secondary && (
              <div className="space-y-2">
                <h3 className="font-medium">Secondary Document</h3>
                <div className="border rounded-md overflow-hidden aspect-[3/2] bg-gray-100 flex items-center justify-center">
                  {viewDocumentUrls.secondary.endsWith('.pdf') ? (
                    <a 
                      href={viewDocumentUrls.secondary} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-blue-500 hover:text-blue-700"
                    >
                      <FileText className="h-12 w-12" />
                      <span className="mt-2">View PDF</span>
                    </a>
                  ) : (
                    <img 
                      src={viewDocumentUrls.secondary} 
                      alt="Secondary Document" 
                      className="max-h-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {selectedDocument?.status === "submitted" && (
            <DialogFooter>
              <Button
                variant="outline" 
                onClick={() => handleRejectVerification(selectedDocument.id)}
                disabled={!!processingId}
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={() => handleApproveVerification(selectedDocument.id)}
                disabled={!!processingId}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationReview;
