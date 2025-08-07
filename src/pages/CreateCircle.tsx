
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CircleForm from "@/components/circle/CircleForm";
import { useCircleForm } from "@/hooks/useCircleForm";
import AuthGuard from "@/components/AuthGuard";
import PageLayout from "@/components/PageLayout";

const CreateCircle = () => {
  const {
    form,
    isSubmitting,
    inviteLink,
    members,
    termsAccepted,
    addMember,
    removeMember,
    generateInviteLink,
    handleTermsAccept,
    handleTermsDecline,
    onSubmit,
  } = useCircleForm();

  return (
    <AuthGuard>
      <PageLayout>
        <div className="container max-w-3xl py-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create a New Savings Circle</CardTitle>
              <CardDescription>
                Set up your savings circle and invite members to join you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CircleForm
                form={form}
                members={members}
                inviteLink={inviteLink}
                termsAccepted={termsAccepted}
                isSubmitting={isSubmitting}
                onSubmit={onSubmit}
                addMember={addMember}
                removeMember={removeMember}
                generateInviteLink={generateInviteLink}
                handleTermsAccept={handleTermsAccept}
                handleTermsDecline={handleTermsDecline}
              />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </AuthGuard>
  );
};

export default CreateCircle;
