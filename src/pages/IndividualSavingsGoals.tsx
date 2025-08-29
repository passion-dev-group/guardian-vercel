import { useEffect } from "react";
import PageLayout from "@/components/PageLayout";
import SoloSavingsGoalsSection from "@/components/savings/SoloSavingsGoalsSection";
import { trackEvent } from "@/lib/analytics";

const IndividualSavingsGoals = () => {
  // Track page view
  useEffect(() => {
    trackEvent('individual_savings_goals_viewed');
  }, []);

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Individual Savings Goals</h1>
          <p className="text-muted-foreground mt-2">
            Set personal savings targets and track your progress towards financial goals.
          </p>
        </div>

        <SoloSavingsGoalsSection />
      </div>
    </PageLayout>
  );
};

export default IndividualSavingsGoals;
