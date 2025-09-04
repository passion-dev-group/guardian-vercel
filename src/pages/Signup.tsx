import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Gift } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [searchParams] = useSearchParams();
  const { processReferralCompletion } = useReferrals();
  
  // Get referral code from URL
  const referralCode = searchParams.get('ref');

  // Use useEffect for redirection instead of doing it during render
  useEffect(() => {
    // Only redirect if user is logged in and we haven't already attempted a redirect
    if (user && !redirectAttempted) {
      setRedirectAttempted(true);
      
      // Process referral completion if there's a referral code
      if (referralCode) {
        console.log('Processing referral completion:', { referralCode, userId: user.id });
        processReferralCompletion(referralCode, user.id, 'signup').then((result) => {
          console.log('Referral completion result:', result);
          if (result.success) {
            toast.success(`Welcome! Your referrer earned $${result.rewardAmount} for inviting you!`);
          } else {
            console.error('Referral completion failed:', result.error);
            // Still show a welcome message, but log the error
            toast.success('Welcome to MiTurn! Your account has been created successfully.');
          }
        }).catch((error) => {
          console.error('Error processing referral completion:', error);
          toast.success('Welcome to MiTurn! Your account has been created successfully.');
        });
      }
      
      navigate("/verify-identity", { replace: true });
    }
  }, [user, navigate, redirectAttempted, referralCode, processReferralCompletion]);

  const validatePassword = (password: string) => {
    return password.length >= 6; // Basic validation, can be expanded
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (!validatePassword(password)) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Sign up the user - the database trigger will handle creating the user_tier automatically
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
      // The redirect will happen automatically through useEffect when user state updates
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md relative">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-16 left-0 text-gray-600 hover:text-gray-900"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>Enter your information to create an account</CardDescription>
            {referralCode && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Gift className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  You're signing up with a referral code!
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Bonus Eligible
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
