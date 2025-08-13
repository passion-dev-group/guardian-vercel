
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import PageLayout from "@/components/PageLayout";
import VerificationBanner from "@/components/VerificationBanner";
import { BadgesSection } from "@/components/profile/BadgesSection";
import { TierProgress } from "@/components/profile/TierProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserBadges } from "@/hooks/useUserBadges";
import { useUserTier } from "@/hooks/useUserTier";

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { badges, isLoading: badgesLoading } = useUserBadges();
  const { userTier, isLoading: tierLoading } = useUserTier();

  return (
    <PageLayout>
      <div className="container max-w-5xl py-6 space-y-8">
        <VerificationBanner />
      
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Profile</h2>
                {profileLoading || !profile ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Name</label>
                      <div className="mt-1 text-gray-900">{profile.display_name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <div className="mt-1 text-gray-900">{user?.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <div className="mt-1 text-gray-900">{profile.phone || "Not set"}</div>
                    </div>
                    
                    {/* Address Information */}
                    {(profile.address_street || profile.address_city || profile.address_state || profile.address_zip) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Address</label>
                        <div className="mt-1 text-gray-900">
                          {profile.address_street && <div>{profile.address_street}</div>}
                          {(profile.address_city || profile.address_state || profile.address_zip) && (
                            <div>
                              {[profile.address_city, profile.address_state, profile.address_zip]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          )}
                          {profile.address_country && profile.address_country !== 'US' && (
                            <div>{profile.address_country}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <TierProgress userTier={userTier} isLoading={tierLoading} />
            </div>
            
            <div className="md:w-2/3">
              <BadgesSection badges={badges || []} isLoading={badgesLoading} />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Profile;
