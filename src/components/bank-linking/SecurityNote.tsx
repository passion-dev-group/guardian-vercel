
import { Lock } from "lucide-react";

const SecurityNote = () => {
  return (
    <div className="mt-8 p-4 bg-muted/30 rounded-lg border text-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-medium mb-1">Your information is secure</h4>
          <p className="text-muted-foreground">
            Your banking credentials are never stored on our servers. We use bank-level 
            encryption to protect your financial data. MiTurn partners with Plaid to 
            securely connect to your bank.
          </p>
          <a 
            href="https://plaid.com/why" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-block mt-2"
          >
            Learn more about why we use Plaid →
          </a>
        </div>
      </div>
    </div>
  );
};

export default SecurityNote;
