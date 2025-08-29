
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";

import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { Separator } from "@/components/ui/separator";
import { User, LockIcon, BellIcon, LogOut, Trash2, Edit, Wallet, PiggyBank, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SavingsSettings from "@/components/savings/SavingsSettings";
import NotificationPreferencesForm from "@/components/account/NotificationPreferencesForm";

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mfaEnabled, setMfaEnabled] = useState(false);
  // Remove loadingMfa

  const { preferences, isLoading, isSaving, savePreferences } = useNotificationPreferences();
  const { isDeleting, deleteAccount } = useAccountDeletion();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Track page view
  useEffect(() => {
    trackEvent('account_settings_viewed');
  }, []);

  useEffect(() => {
    // Fetch current MFA status from DB
    const fetchMfaStatus = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("mfa_enabled")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          setMfaEnabled(!!data.mfa_enabled);
        }
      }
    };
    fetchMfaStatus();
  }, [user]);

  const handleEditProfile = () => {
    trackEvent('profile_edit_clicked');
    navigate('/profile');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      trackEvent('password_changed');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("Failed to change password");
    }
  };

  const handleToggleMFA = async () => {
    const newMfaState = !mfaEnabled;
    setMfaEnabled(newMfaState);
    toast.info(newMfaState ? "MFA enabled" : "MFA disabled");
    trackEvent('mfa_toggled', { enabled: newMfaState });
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ mfa_enabled: newMfaState })
        .eq("id", user.id);
      if (error) {
        toast.error("Failed to update MFA status in database.");
        setMfaEnabled(!newMfaState); // revert
      }
    }
  };

  const handleLogout = async () => {
    trackEvent('logged_out');
    await signOut();
    navigate('/login');
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    const success = await deleteAccount(deleteConfirmText);

    if (success) {
      navigate('/');
    }

    setDeleteDialogOpen(false);
    setDeleteConfirmText("");
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        <div className="space-y-8">
          {/* Profile Summary */}
          <section aria-labelledby="profile-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="profile-heading" className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Summary
              </h2>

              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Display Name</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.display_name || user?.user_metadata?.full_name || "Not set"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditProfile}
                    className="flex items-center gap-1 self-start"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Security Settings */}
          <section aria-labelledby="security-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="security-heading" className="text-xl font-semibold flex items-center gap-2">
                <LockIcon className="h-5 w-5" />
                Security Settings
              </h2>

              <div className="mt-4 space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Change Password</h3>
                  {isChangingPassword ? (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit">Update Password</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsChangingPassword(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button onClick={() => setIsChangingPassword(true)}>
                      Change Password
                    </Button>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Multi-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="mfa-toggle"
                        checked={mfaEnabled}
                        onCheckedChange={handleToggleMFA}
                      />
                      <Label htmlFor="mfa-toggle">
                        {mfaEnabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Savings Settings */}
          <section aria-labelledby="savings-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="savings-heading" className="text-xl font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Automated Savings
              </h2>

              <div className="mt-4">
                <SavingsSettings />
              </div>
            </div>
          </section>

          {/* Individual Savings Goals Navigation */}
          <section aria-labelledby="individual-savings-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="individual-savings-heading" className="text-xl font-semibold flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Individual Savings Goals
              </h2>
              
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Set personal savings targets and track your progress towards financial goals.
                </p>
                <Button
                  onClick={() => navigate('/individual-savings-goals')}
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Manage Savings Goals
                </Button>
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section aria-labelledby="notifications-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="notifications-heading" className="text-xl font-semibold flex items-center gap-2">
                <BellIcon className="h-5 w-5" />
                Notification Preferences
              </h2>

              <div className="mt-4 space-y-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading preferences...</p>
                ) : (
                  <NotificationPreferencesForm
                    preferences={preferences}
                    isSaving={isSaving}
                    savePreferences={savePreferences}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Account Controls */}
          <section aria-labelledby="account-controls-heading" className="bg-card rounded-lg shadow">
            <div className="p-6">
              <h2 id="account-controls-heading" className="text-xl font-semibold">
                Account Controls
              </h2>

              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">
              Please type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccountConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </PageLayout>
  );
};

export default AccountSettings;
