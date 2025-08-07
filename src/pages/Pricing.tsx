
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Calculator, HelpCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import NavigationTabs from '@/components/NavigationTabs';
import PricingTable from '@/components/pricing/PricingTable';
import PricingDetails from '@/components/pricing/PricingDetails';
import CostCalculator from '@/components/pricing/CostCalculator';
import ExampleScenarios from '@/components/pricing/ExampleScenarios';
import PricingFAQ from '@/components/pricing/PricingFAQ';

const Pricing = () => {
  useEffect(() => {
    trackEvent('pricing_viewed');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <NavigationTabs />
      
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Choose the plan that works best for your savings goals. No hidden fees, no surprises.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            All plans include bank-level security & 24/7 support
          </Badge>
        </motion.section>

        {/* Pricing Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PricingTable />
        </motion.section>

        {/* Pricing Details */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <PricingDetails />
        </motion.section>

        {/* Cost Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CostCalculator />
        </motion.section>

        {/* Example Scenarios */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ExampleScenarios />
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <PricingFAQ />
        </motion.section>
      </main>
    </div>
  );
};

export default Pricing;
