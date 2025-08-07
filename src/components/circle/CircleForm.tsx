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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import MemberInvitation from "./MemberInvitation";
import TermsAndConditionsCheckbox from "./TermsAndConditionsCheckbox";
import InviteLinkDisplay from "./InviteLinkDisplay";
import { CircleFormValues } from "@/hooks/useCircleForm";
import { UseFormReturn } from "react-hook-form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Users } from "lucide-react";
import { ContactsPicker } from "@/components/contacts/ContactsPicker";
import { useNavigate } from "react-router-dom";
import EnhancedMemberInvitation from "./EnhancedMemberInvitation";
import { useEnhancedInvites } from "@/hooks/useEnhancedInvites";

interface CircleFormProps {
  form: UseFormReturn<CircleFormValues>;
  members: string[];
  inviteLink: string;
  termsAccepted: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CircleFormValues) => void;
  addMember: (email: string) => boolean;
  removeMember: (email: string) => void;
  generateInviteLink: () => void;
  handleTermsAccept: () => void;
  handleTermsDecline: () => void;
}

const CircleForm = ({
  form,
  members,
  inviteLink,
  termsAccepted,
  isSubmitting,
  onSubmit,
  addMember,
  removeMember,
  generateInviteLink,
  handleTermsAccept,
  handleTermsDecline,
}: CircleFormProps) => {
  const navigate = useNavigate();
  const circleName = form.watch("name");
  const circleAmount = form.watch("amount");

  const {
    members: enhancedMembers,
    addMember: addEnhancedMember,
    removeMember: removeEnhancedMember,
    sendInvites
  } = useEnhancedInvites(undefined, circleName);
  
  const handleCancel = () => {
    navigate(-1);
  };
  
  return (
    <Form {...form}>
      <div className="flex items-center mb-4">
        <Button 
          type="button"
          variant="ghost" 
          size="sm" 
          className="gap-1" 
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Circle Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter circle name" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Give your savings circle a memorable name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contribution Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The amount each member will contribute per cycle.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contribution Frequency</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How often contributions will be collected.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Invite Members</h3>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="flex gap-2">
                  <Users className="h-4 w-4" />
                  <span>From Contacts</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-md w-[90vw]">
                <SheetHeader>
                  <SheetTitle>Invite from Contacts</SheetTitle>
                  <SheetDescription>
                    Select contacts to invite to your savings circle
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <ContactsPicker />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* <EnhancedMemberInvitation
            members={enhancedMembers}
            addMember={addEnhancedMember}
            removeMember={removeEnhancedMember}
            sendInvites={sendInvites}
          /> */}
          
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Email-only Invites (Legacy)
            </h4>
            <MemberInvitation 
              members={members} 
              addMember={addMember} 
              removeMember={removeMember} 
            />
          </div>
        </div>

        <InviteLinkDisplay inviteLink={inviteLink} />

        <TermsAndConditionsCheckbox
          form={form}
          termsAccepted={termsAccepted}
          onAccept={handleTermsAccept}
          onDecline={handleTermsDecline}
        />

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={generateInviteLink}
            disabled={!form.getValues("name") || isSubmitting}
          >
            Generate Invite Link
          </Button>

          <div className="flex gap-2 sm:ml-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !termsAccepted}
            >
              {isSubmitting ? "Creating..." : "Create Circle"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default CircleForm;
