
import TermsAndConditionsDialog from "@/components/circle/TermsAndConditionsDialog";
import { FormField, FormItem, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { CircleFormValues } from "@/hooks/useCircleForm";
import { Check, ExternalLink } from "lucide-react";

interface TermsAndConditionsCheckboxProps {
  form: UseFormReturn<CircleFormValues>;
  termsAccepted: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const TermsAndConditionsCheckbox = ({
  form,
  termsAccepted,
  onAccept,
  onDecline,
}: TermsAndConditionsCheckboxProps) => {
  return (
    <FormField
      control={form.control}
      name="acceptTerms"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <input
              type="checkbox"
              checked={termsAccepted}
              className="hidden"
              onChange={() => {}} // Handled by dialog
              {...field}
              value=""
            />
          </FormControl>
          <div className="space-y-1 leading-none flex-1">
            <div className="flex items-center gap-2">
              <span className={termsAccepted ? "text-foreground" : "text-muted-foreground"}>
                I accept the
              </span>
              <TermsAndConditionsDialog 
                trigger={
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-4 flex items-center gap-1"
                  >
                    Terms and Conditions
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                }
                onAccept={onAccept}
                onDecline={onDecline}
              />
              {termsAccepted && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Accepted</span>
                </div>
              )}
            </div>
            <FormDescription>
              You must agree to the terms before creating a circle.
            </FormDescription>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
};

export default TermsAndConditionsCheckbox;
