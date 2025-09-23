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
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RevokeACHDialogProps {
	circleId: string;
	circleName: string;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RevokeACHDialog({
	circleId,
	circleName,
	isOpen,
	onOpenChange,
}: RevokeACHDialogProps) {
	const { user } = useAuth();
	const { toast } = useToast();
	const [isRevoking, setIsRevoking] = useState(false);

	const handleRevoke = async () => {
		if (!user) {
			toast({ title: "Authentication Required", description: "Please log in to continue.", variant: "destructive" });
			return;
		}

		setIsRevoking(true);
		try {
			// Start a transaction to remove user from circle and revoke ACH authorization
			const { error: circleMemberError } = await supabase
				.from('circle_members')
				.delete()
				.eq('circle_id', circleId)
				.eq('user_id', user.id);

			if (circleMemberError) {
				throw new Error(`Failed to remove from circle: ${circleMemberError.message}`);
			}

			// Revoke ACH authorization
			const { error: achError } = await supabase
				.from('circle_ach_authorizations')
				.update({ 
					status: 'revoked',
					revoked_at: new Date().toISOString()
				})
				.eq('circle_id', circleId)
				.eq('user_id', user.id)
				.eq('status', 'authorized');

			if (achError) {
				throw new Error(`Failed to revoke ACH authorization: ${achError.message}`);
			}

			// Also remove any recurring contributions for this circle
			const { error: recurringError } = await supabase
				.from('recurring_contributions')
				.delete()
				.eq('circle_id', circleId)
				.eq('user_id', user.id);

			if (recurringError) {
				console.warn('Failed to remove recurring contributions:', recurringError.message);
				// Don't throw here as this is not critical
			}

			toast({
				title: "ACH Authorization Revoked",
				description: `You have successfully left the circle "${circleName}" and revoked your ACH authorization.`,
			});

			onOpenChange(false);
		} catch (e) {
			toast({ 
				title: "Revocation Failed", 
				description: e instanceof Error ? e.message : 'Please try again.', 
				variant: "destructive" 
			});
		} finally {
			setIsRevoking(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Revoke ACH Authorization
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to revoke your ACH authorization for "{circleName}"?
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
							<div className="space-y-2">
								<p className="text-sm font-medium text-destructive">
									This action will:
								</p>
								<ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
									<li>Remove you from the circle "{circleName}"</li>
									<li>Revoke your ACH authorization</li>
									<li>Cancel any scheduled recurring contributions</li>
									<li>Delete your data from this circle</li>
								</ul>
							</div>
						</div>
					</div>

					<div className="bg-muted/50 rounded-lg p-4">
						<p className="text-sm text-muted-foreground">
							<strong>Note:</strong> This action cannot be undone. You will need to be re-invited to join this circle again.
						</p>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button 
						variant="outline" 
						onClick={() => onOpenChange(false)} 
						disabled={isRevoking}
					>
						Cancel
					</Button>
					<Button 
						variant="destructive" 
						onClick={handleRevoke} 
						disabled={isRevoking}
						className="min-w-[120px]"
					>
						{isRevoking ? 'Revoking...' : 'Yes, Revoke'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default RevokeACHDialog;
// RevokeACHDialog component
