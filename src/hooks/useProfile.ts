
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/profile';
import { toast } from 'sonner';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profile data
  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile data
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        toast.error('Failed to update profile');
        console.error('Error updating profile:', error);
        return;
      }
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
      
      // Analytics event
      try {
        // In a real application, replace with your actual analytics service
        console.log('Analytics event: profile_updated', { 
          user_id: user.id,
          ...updates 
        });
      } catch (e) {
        console.error('Analytics error:', e);
      }
      
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload avatar
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user || !file) return null;
    
    try {
      // Generate a unique filename to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        toast.error('Failed to upload avatar');
        console.error('Error uploading avatar:', error);
        return null;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Analytics event
      try {
        console.log('Analytics event: avatar_uploaded', { 
          user_id: user.id,
          file_size: file.size,
          file_type: file.type
        });
      } catch (e) {
        console.error('Analytics error:', e);
      }
      
      return publicUrl;
    } catch (error) {
      toast.error('Failed to upload avatar');
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      
      // Analytics event
      try {
        console.log('Analytics event: profile_viewed', { user_id: user.id });
      } catch (e) {
        console.error('Analytics error:', e);
      }
    }
  }, [user]);

  return {
    profile,
    isLoading,
    isSaving,
    updateProfile,
    uploadAvatar
  };
};
