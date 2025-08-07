
import { useState } from "react";
import { CreditCard, Calendar, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

interface CardEntryFormProps {
  onCardSaved: (lastFour: string) => void;
}

const CardEntryForm = ({ onCardSaved }: CardEntryFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCardNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted.substring(0, 19); // "XXXX XXXX XXXX XXXX"
  };

  const formatExpiry = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length > 2) {
      return `${digitsOnly.substring(0, 2)}/${digitsOnly.substring(2, 4)}`;
    }
    return digitsOnly;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cardNumber.replace(/\s/g, "").length < 16) {
      toast.error("Please enter a valid card number");
      return;
    }
    
    if (expiry.length < 5) {
      toast.error("Please enter a valid expiration date (MM/YY)");
      return;
    }
    
    if (cvc.length < 3) {
      toast.error("Please enter a valid CVC code");
      return;
    }
    
    setIsSubmitting(true);
    trackEvent('card_entry_submitted');
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      const lastFour = cardNumber.replace(/\s/g, "").slice(-4);
      onCardSaved(lastFour);
      toast.success("Card added successfully!");
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="cardNumber"
            placeholder="0000 0000 0000 0000"
            className="pl-10"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            required
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="space-y-2 flex-1">
          <Label htmlFor="expiry">Expiration Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="expiry"
              placeholder="MM/YY"
              className="pl-10"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              maxLength={5}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2 flex-1">
          <Label htmlFor="cvc">CVC</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="cvc"
              placeholder="000"
              className="pl-10"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
              maxLength={4}
              required
            />
          </div>
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Card"}
      </Button>
    </form>
  );
};

export default CardEntryForm;
