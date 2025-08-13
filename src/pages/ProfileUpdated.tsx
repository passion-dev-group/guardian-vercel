
import React, { useState, useRef, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useUserBadges } from '@/hooks/useUserBadges';
import { useUserTier } from '@/hooks/useUserTier';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import NotificationSettings from '@/components/NotificationSettings';
import { BadgesSection } from '@/components/profile/BadgesSection';
import { TierProgress } from '@/components/profile/TierProgress';
import PageLayout from '@/components/PageLayout';
import { TierBadge } from '@/components/gamification/TierBadge';
import { trackEvent } from '@/lib/analytics';

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading, isSaving, updateProfile, uploadAvatar } = useProfile();
  const { badges, isLoading: badgesLoading } = useUserBadges();
  const { userTier, isLoading: tierLoading } = useUserTier();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isFormModified, setIsFormModified] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Address fields
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('US');
  
  // Initialize form when profile is loaded
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url);
      setAddressStreet(profile.address_street || '');
      setAddressCity(profile.address_city || '');
      setAddressState(profile.address_state || '');
      setAddressZip(profile.address_zip || '');
      setAddressCountry(profile.address_country || 'US');
    }
  }, [profile]);
  
  // Detect form changes
  useEffect(() => {
    if (!profile) return;
    
    const isModified = 
      (displayName !== (profile.display_name || '')) || 
      (avatarFile !== null) ||
      (addressStreet !== (profile.address_street || '')) ||
      (addressCity !== (profile.address_city || '')) ||
      (addressState !== (profile.address_state || '')) ||
      (addressZip !== (profile.address_zip || '')) ||
      (addressCountry !== (profile.address_country || 'US'));
      
    setIsFormModified(isModified);
  }, [displayName, avatarFile, profile, addressStreet, addressCity, addressState, addressZip, addressCountry]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setAvatarFile(null);
      return;
    }
    
    const file = e.target.files[0];
    
    // Basic validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size should not exceed 5MB');
      return;
    }
    
    if (!file.type.match('image.*')) {
      toast.error('Please select an image file');
      return;
    }
    
    setAvatarFile(file);
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setAvatarUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First upload the avatar if there's a new file
      let updatedAvatarUrl = profile?.avatar_url;
      
      if (avatarFile) {
        updatedAvatarUrl = await uploadAvatar(avatarFile);
        if (!updatedAvatarUrl) return;
      }
      
      // Then update the profile
      await updateProfile({
        display_name: displayName,
        avatar_url: updatedAvatarUrl,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        address_country: addressCountry
      });
      
      // Reset the file input
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsFormModified(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    trackEvent('profile_tab_changed', { tab: value });
  };

  return (
    <PageLayout>
      <div className="container mx-auto py-8 px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <div className="flex items-center mt-2">
            <p className="text-muted-foreground">Manage your profile and settings</p>
            {userTier && !tierLoading && (
              <div className="ml-auto">
                <TierBadge tier={userTier.tier} size="md" />
              </div>
            )}
          </div>
        </header>
        
        {(isLoading || tierLoading) ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={handleTabChange}
                className="mb-8"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Settings</CardTitle>
                      <CardDescription>
                        Update your profile information and avatar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center space-y-4">
                          <div 
                            onClick={handleAvatarClick}
                            className="relative cursor-pointer group"
                            role="button"
                            aria-label="Upload avatar image"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleAvatarClick();
                              }
                            }}
                          >
                            <Avatar className="w-24 h-24">
                              {avatarUrl ? (
                                <AvatarImage src={avatarUrl} alt={displayName || 'User avatar'} />
                              ) : (
                                <AvatarFallback className="text-xl">
                                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              Change
                            </div>
                          </div>
                          
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                            aria-label="Upload avatar image"
                          />
                          
                          <p className="text-sm text-gray-500">
                            Click the avatar to upload a new image
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <label htmlFor="email" className="block text-sm font-medium">
                            Email
                          </label>
                          <Input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            aria-label="Email"
                          />
                          <p className="text-xs text-gray-500">
                            Your email address cannot be changed
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <label htmlFor="displayName" className="block text-sm font-medium">
                            Display Name
                          </label>
                          <Input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                            aria-label="Display Name"
                          />
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Address Information</h3>
                          <p className="text-sm text-muted-foreground">
                            Your address is used for payment processing and compliance requirements.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <label htmlFor="addressStreet" className="block text-sm font-medium">
                                Street Address
                              </label>
                              <Input
                                id="addressStreet"
                                type="text"
                                value={addressStreet}
                                onChange={(e) => setAddressStreet(e.target.value)}
                                placeholder="Enter street address"
                                aria-label="Street Address"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <label htmlFor="addressCity" className="block text-sm font-medium">
                                City
                              </label>
                              <Input
                                id="addressCity"
                                type="text"
                                value={addressCity}
                                onChange={(e) => setAddressCity(e.target.value)}
                                placeholder="Enter city"
                                aria-label="City"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <label htmlFor="addressState" className="block text-sm font-medium">
                                State/Province
                              </label>
                              <Input
                                id="addressState"
                                type="text"
                                value={addressState}
                                onChange={(e) => setAddressState(e.target.value)}
                                placeholder="Enter state or province"
                                aria-label="State/Province"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <label htmlFor="addressZip" className="block text-sm font-medium">
                                ZIP/Postal Code
                              </label>
                              <Input
                                id="addressZip"
                                type="text"
                                value={addressZip}
                                onChange={(e) => setAddressZip(e.target.value)}
                                placeholder="Enter ZIP or postal code"
                                aria-label="ZIP/Postal Code"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <label htmlFor="addressCountry" className="block text-sm font-medium">
                              Country
                            </label>
                            <Input
                              id="addressCountry"
                              type="text"
                              value={addressCountry}
                              onChange={(e) => setAddressCountry(e.target.value)}
                              placeholder="Enter country"
                              aria-label="Country"
                            />
                          </div>
                        </div>
                      </form>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        onClick={handleSubmit}
                        disabled={!isFormModified || isSaving}
                        className="ml-auto"
                      >
                        {isSaving ? (
                          <>
                            <LoadingSpinner size="small" /> Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="badges">
                  <div className="space-y-6">
                    <BadgesSection badges={badges} isLoading={badgesLoading} />
                  </div>
                </TabsContent>
                
                <TabsContent value="notifications">
                  <NotificationSettings />
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="space-y-6">
              <TierProgress userTier={userTier} isLoading={tierLoading} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Stats</CardTitle>
                  <CardDescription>Your activity overview</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <LoadingSpinner size="small" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Member since</span>
                        <span className="font-medium">
                          {profile?.created_at 
                            ? new Date(profile.created_at).toLocaleDateString() 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Badges earned</span>
                        <span className="font-medium">{badges.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current streak</span>
                        <span className="font-medium">{userTier?.current_streak || 0} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Longest streak</span>
                        <span className="font-medium">{userTier?.longest_streak || 0} payments</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Profile;
