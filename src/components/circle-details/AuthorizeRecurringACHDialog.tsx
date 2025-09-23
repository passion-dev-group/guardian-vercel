import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, CreditCard, AlertCircle } from "lucide-react";
import { plaidService } from "@/lib/plaid";
import { formatCurrency, getCurrentIpAddress, hashString } from "@/lib/utils";
import { useLinkedBankAccounts } from "@/hooks/useLinkedBankAccounts";
import { FrequencyType } from "@/types/frequency";

interface AuthorizeRecurringACHDialogProps {
	circleId: string;
	circleName: string;
	contributionAmount: number;
	frequency: FrequencyType;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAuthorizationSuccess?: () => void;
}

export function AuthorizeRecurringACHDialog({
	circleId,
	circleName,
	contributionAmount,
	frequency,
	isOpen,
	onOpenChange,
	onAuthorizationSuccess,
}: AuthorizeRecurringACHDialogProps) {
	const { user } = useAuth();
	const { toast } = useToast();
	const { accounts, loading: accountsLoading } = useLinkedBankAccounts();
	const [selectedAccountId, setSelectedAccountId] = useState<string>("");
	const [consentChecked, setConsentChecked] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleAuthorize = async () => {
		if (!user) {
			toast({ title: "Authentication Required", description: "Please log in to continue.", variant: "destructive" });
			return;
		}
		if (!selectedAccountId) {
			toast({ title: "Bank Account Required", description: "Please select a bank account.", variant: "destructive" });
			return;
		}
		if (!consentChecked) {
			toast({ title: "Consent Required", description: "You must agree to the ACH authorization.", variant: "destructive" });
			return;
		}

		setIsSubmitting(true);
		try {
			const selectedAccount = accounts.find(a => a.account_id === selectedAccountId);
			if (!selectedAccount) throw new Error("Selected bank account not found");

			// Check if user has already linked a bank account and provided consent
			if (!selectedAccount.plaid_access_token) {
				throw new Error("Bank account not properly linked. Please re-link your account.");
			}

			// Create consent text for NACHA compliance
			const consentText = `I authorize recurring ACH debits of ${formatCurrency(contributionAmount)} ${frequency} for ${circleName} under NACHA rules. This authorization will remain in effect until I revoke it.`;
			const consent_hash = await hashString(consentText);

			// Store the authorization and mark member as ready
			await plaidService.storeAchAuthorization({
				circle_id: circleId,
				plaid_account_id: selectedAccountId,
				linked_bank_account_id: (selectedAccount as any).id,
				amount: contributionAmount,
				frequency,
				consent_text_hash: consent_hash,
				user_agent: navigator.userAgent,
				ip_address: await getCurrentIpAddress(),
			});

			toast({
				title: "ACH Authorization Recorded",
				description: `Your authorization has been recorded. We will initiate scheduling when the circle starts.`,
			});
			
			// Call success callback if provided
			if (onAuthorizationSuccess) {
				onAuthorizationSuccess();
			}
			
			onOpenChange(false);
			setSelectedAccountId("");
			setConsentChecked(false);
		} catch (e) {
			toast({ title: "Authorization Failed", description: e instanceof Error ? e.message : 'Please try again.', variant: "destructive" });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Authorize Recurring ACH
					</DialogTitle>
					<DialogDescription>
						Authorize recurring ACH contributions for your circle "{circleName}".
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					<div className="bg-muted/50 rounded-lg p-4 space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Amount</span>
							<span className="font-semibold">{formatCurrency(contributionAmount)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Frequency</span>
							<span className="font-medium">{frequency}</span>
						</div>
					</div>

					<div className="space-y-3">
						<Label htmlFor="bank-account">Select Bank Account</Label>
						{accountsLoading ? (
							<div className="animate-pulse">
								<div className="h-10 bg-muted rounded-md"></div>
							</div>
						) : accounts.length === 0 ? (
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
								<div className="flex items-center gap-2 text-yellow-800">
									<AlertCircle className="h-4 w-4" />
									<span className="text-sm font-medium">No Bank Accounts Linked</span>
								</div>
								<p className="text-sm text-yellow-700 mt-1">
									Link a bank account to continue.
								</p>
							</div>
						) : (
							<Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
								<SelectTrigger>
									<SelectValue placeholder="Choose a bank account" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((account) => (
										<SelectItem key={account.account_id} value={account.account_id}>
											<div className="flex items-center gap-2">
												<CreditCard className="h-4 w-4" />
												<span>{account.institution_name} - {account.account_name}</span>
												<span className="text-muted-foreground">****{account.mask}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="space-y-3">
						<Label className="text-sm font-medium">ACH Authorization</Label>
						<div className="text-xs text-muted-foreground space-y-2 border rounded-md p-3 bg-muted/30">
							<p>
								By checking the box below, you authorize us to initiate recurring ACH debit entries from the selected bank account for the amount and frequency shown above, and to initiate credit entries to correct errors, in accordance with NACHA operating rules. You may revoke this authorization at any time by cancelling your recurring contributions in the app.
							</p>
							<p>
								You certify that you are an authorized user of this bank account and that you will not dispute these scheduled debits with your bank so long as the transactions correspond to the terms indicated in this authorization.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<input id="consent" type="checkbox" className="h-4 w-4" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
							<Label htmlFor="consent" className="text-sm">I agree to the ACH authorization terms.</Label>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
					<Button onClick={handleAuthorize} disabled={isSubmitting || accounts.length === 0 || !consentChecked} className="min-w-[160px]">
						{isSubmitting ? 'Authorizing...' : 'Authorize ACH'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default AuthorizeRecurringACHDialog;
