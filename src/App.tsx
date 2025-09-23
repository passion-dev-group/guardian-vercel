import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from '@/contexts/AuthContext';
import AnimatedLoadingSpinner from "@/components/AnimatedLoadingSpinner";
import AnimatedPageWrapper from "@/components/AnimatedPageWrapper";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Pricing = lazy(() => import("./pages/Pricing"));
const VerifyIdentity = lazy(() => import("./pages/VerifyIdentity"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/ProfileUpdated"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const CreateCircle = lazy(() => import("./pages/CreateCircle"));
const JoinCircle = lazy(() => import("./pages/JoinCircle"));
const LinkBank = lazy(() => import("./pages/LinkBank"));
const CircleDetails = lazy(() => import("./pages/CircleDetails"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SocialFeed = lazy(() => import("./pages/SocialFeed"));
const SavingsGoals = lazy(() => import("./pages/SavingsGoals"));
const GoalDetailsPage = lazy(() => import("./pages/GoalDetailsPage"));
const SoloGoalDetailsPage = lazy(() => import("./pages/SoloGoalDetailsPage"));
const IndividualSavingsGoals = lazy(() => import("./pages/IndividualSavingsGoals"));
const IndividualGoalDetails = lazy(() => import("./pages/IndividualGoalDetails"));
const Referrals = lazy(() => import("./pages/Referrals"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const LoadingSpinner = lazy(() => import("@/components/LoadingSpinner"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Create a new QueryClient with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

// Separate component to use auth context hooks
const AppContent = () => {
  const { isLoading } = useAuth();
  
  // Show loading spinner while authentication is initializing
  if (isLoading) {
    return (
      <Suspense fallback={<div />}>
        <LoadingSpinner fullScreen size="large" />
      </Suspense>
    );
  }
  
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<AnimatedLoadingSpinner />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <AnimatedPageWrapper>
                <Index />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/login"
            element={
              <AnimatedPageWrapper>
                <Login />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/signup"
            element={
              <AnimatedPageWrapper>
                <Signup />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/pricing"
            element={
              <AnimatedPageWrapper>
                <Pricing />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/about"
            element={
              <AnimatedPageWrapper>
                <About />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AnimatedPageWrapper>
                <ForgotPassword />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AnimatedPageWrapper>
                <ResetPassword />
              </AnimatedPageWrapper>
            }
          />
          
          {/* Auth routes */}
          <Route
            path="/verify-identity"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <VerifyIdentity />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/profile"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/account"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <AccountSettings />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/create-circle"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <CreateCircle />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/join-circle"
            element={
              <AnimatedPageWrapper>
                <JoinCircle />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/link-bank"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <LinkBank />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/circles/:circleId"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <CircleDetails />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/analytics"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <Analytics />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/feed"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <SocialFeed />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/referrals"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <Referrals />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/savings-goals"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <SavingsGoals />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/individual-savings-goals"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <IndividualSavingsGoals />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/individual-savings-goals/:goalId"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <IndividualGoalDetails />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/savings-goals/:goalId"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <SoloGoalDetailsPage />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/circle-goals/:goalId"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <GoalDetailsPage />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          
          {/* Catch-all route */}
          <Route
            path="/admin"
            element={
              <AnimatedPageWrapper>
                <AuthGuard>
                  <Admin />
                </AuthGuard>
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="*"
            element={
              <AnimatedPageWrapper>
                <NotFound />
              </AnimatedPageWrapper>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default App;
