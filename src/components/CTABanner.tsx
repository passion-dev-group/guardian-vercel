import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { ArrowRight, Users, Sparkles, ShieldCheck } from "lucide-react";

const CTABanner: React.FC = () => {
  const handleCtaClick = () => {
    trackEvent('cta_clicked');
  };

  return (
    <motion.section 
      className="relative px-6 py-20 md:py-24 md:px-12 lg:px-24 bg-gradient-to-r from-primary via-primary to-purple-600 text-white overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Icon decoration */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
            <Users className="h-5 w-5" />
            <Sparkles className="h-5 w-5" />
          </div>
        </motion.div>
        
        <motion.h2 
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Ready to start saving?
        </motion.h2>
        
        <motion.p 
          className="text-xl md:text-2xl mb-10 opacity-90 leading-relaxed max-w-2xl mx-auto"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join our community of savers and achieve your financial goals together.
        </motion.p>
        
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white text-primary hover:bg-gray-50 font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 group"
            asChild
            onClick={handleCtaClick}
          >
            <Link to="/signup">
              <span className="flex items-center">
                Create Your Account 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </Link>
          </Button>
        </motion.div>
        
        {/* Trust indicators */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm opacity-75"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.75 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <span className="flex items-center">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Bank-level security
          </span>
          <span className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            10,000+ active savers
          </span>
          <span className="flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            $2M+ saved together
          </span>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default CTABanner;
