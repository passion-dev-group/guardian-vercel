import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnctzmgmoopmfohdypcb.supabase.co';

export const useVeriff = () => {
    const { user } = useAuth();

    const uploadIdImageToSupabase = async (file: File): Promise<string | null> => {
        if (!user) {
            toast.error('You must be logged in to upload.');
            return null;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `ids/${fileName}`;
        const { data, error } = await supabase.storage
            .from('verification-documents')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) {
            toast.error('Failed to upload ID image.');
            return null;
        }
        const { data: publicUrlData } = supabase.storage
            .from('verification-documents')
            .getPublicUrl(filePath);
        return publicUrlData.publicUrl;
    };

    const submitToVeriff = async (file: File): Promise<{ success: boolean; verificationUrl?: string; sessionId?: string }> => {
        if (!user) {
            toast.error('You must be logged in to submit.');
            return { success: false };
        }

        try {
            // Convert file to base64 using FileReader
            const fileBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    // Keep the complete data URL format
                    resolve(result);
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            console.log({fileBase64});
            // Call edge function
            const response = await fetch(`${supabaseUrl}/functions/v1/veriff-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id,
                    email: user.email,
                    file_base64: fileBase64,
                    file_name: file.name,
                }),
            });

            const data = await response.json();
            console.log({data});
            if (!response.ok) {
                toast.error(data.error || 'Failed to submit to Veriff');
                return { success: false };
            }

            return {
                success: true,
                verificationUrl: data.verificationUrl,
                sessionId: data.sessionId,
            };
        } catch (error) {
            console.error('Error submitting to Veriff:', error);
            toast.error('Failed to submit to Veriff');
            return { success: false };
        }
    };

    const documentSubmit = async (driverLicenseFile: File, secondaryDocumentFile?: File) => {


        // Submit to Veriff
        const veriffResult = await submitToVeriff(driverLicenseFile);

        if (!veriffResult.success) {
            toast.error('Failed to submit to Veriff.');
            return { driverLicenseUrl: null, secondaryDocumentUrl: null };
        }


        // Upload to Supabase Storage
        const driverLicenseUrl = await uploadIdImageToSupabase(driverLicenseFile);
        let secondaryDocumentUrl = null;

        if (secondaryDocumentFile) {
            secondaryDocumentUrl = await uploadIdImageToSupabase(secondaryDocumentFile);
        }

        if (!driverLicenseUrl) {
            toast.error('Failed to upload documents to storage.');
            return { driverLicenseUrl: null, secondaryDocumentUrl: null };
        }

        // Store in database - handle resubmissions by checking if record exists
        const { data: existingRecord } = await supabase
            .from('user_verifications')
            .select('user_id')
            .eq('user_id', user!.id)
            .single();

        let error;
        if (existingRecord) {
            // Update existing record
            const { error: updateError } = await supabase
                .from('user_verifications')
                .update({
                    driver_license_url: driverLicenseUrl,
                    secondary_document_url: secondaryDocumentUrl,
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                })
                .eq('user_id', user!.id);
            error = updateError;
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('user_verifications')
                .insert({
                    user_id: user!.id,
                    driver_license_url: driverLicenseUrl,
                    secondary_document_url: secondaryDocumentUrl,
                    status: 'submitted',
                    submitted_at: new Date().toISOString()
                });
            error = insertError;
        }

        if (error) {
            toast.error('Failed to store verification data.');
            return { driverLicenseUrl: null, secondaryDocumentUrl: null };
        }

        toast.success('Document submitted successfully.');
        return {
            driverLicenseUrl,
            secondaryDocumentUrl,
            verificationUrl: veriffResult.verificationUrl,
            sessionId: veriffResult.sessionId
        };
    };

    return {
        uploadIdImage: uploadIdImageToSupabase,
        submitToVeriff,
        documentSubmit
    };
};