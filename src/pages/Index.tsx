import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FeatureCard from "@/components/FeatureCard";
import { trackEvent } from "@/lib/analytics";
import Hero from "@/components/Hero";
import CTABanner from "@/components/CTABanner";
import NavigationTabs from "@/components/NavigationTabs";
import { motion } from "framer-motion";
import { 
  MoreHorizontal,
  LogIn,
  PlusCircle,
  Info,
  HelpCircle,
  LogOut,
  UserIcon,
  Home,
  BarChart3,
  CircleDollarSign,
  Users,
  Settings,
  CreditCard,
  Banknote
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { user, signOut } = useAuth();
  const featuresRef = useRef<HTMLDivElement>(null);
  
  // Track page view on component mount
  useEffect(() => {
    // Ensure smooth scrolling for the whole document
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Track homepage view
    trackEvent('homepage_viewed');
    
    // Cleanup smooth scroll behavior on unmount
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);
  
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleButtonClick = (eventName: string) => {
    trackEvent(eventName);
  };

  const handleDropdownOpen = () => {
    trackEvent('options_opened');
  };
  
  const handleOptionSelect = (optionName: string) => {
    trackEvent(`option_selected_${optionName}`);
  };
  
  const handleLogout = async () => {
    handleOptionSelect('log_out');
    await signOut();
  };

  const features = [
    {
      title: "Create Circles",
      description: "Start or join savings circles with friends, family, or colleagues to achieve your financial goals together.",
      icon: "circle-users"
    },
    {
      title: "Automate Savings",
      description: "Set up recurring contributions that fit your budget and schedule. Never miss a payment with smart reminders.",
      icon: "calendar-clock"
    },
    {
      title: "Fair Rotation",
      description: "Our algorithm ensures everyone gets their turn in a transparent and equitable rotation system.",
      icon: "repeat"
    },
    {
      title: "Secure & Trusted",
      description: "Bank-level encryption and security protocols keep your information and transactions safe at all times.",
      icon: "shield-check"
    }
  ];
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation Tabs */}
      <NavigationTabs />

      {/* Hero Section */}
      <div className="relative">
        <Hero scrollToFeatures={scrollToFeatures} />
      </div>

      {/* Action Button for logged in users */}
      {user && (
        <motion.div 
          className="bg-gradient-to-r from-gray-50 to-blue-50/30 py-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              asChild 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/create-circle" onClick={() => handleButtonClick('homepage_create_circle_clicked')}>
                Create Your Savings Circle
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Enhanced Features Grid */}
      <section 
        ref={featuresRef} 
        className="px-6 py-20 md:py-28 md:px-12 lg:px-24 bg-gradient-to-b from-white to-gray-50/50"
        id="features"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            How MiTurn Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simple, secure, and social savings that puts your financial goals within reach.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>
      </section>

      {/* Enhanced CTA Banner */}
      <CTABanner />

      {/* Enhanced Footer */}
      <motion.footer 
        className="bg-gray-900 text-white px-6 py-12 md:px-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">MiTurn</h3>
            <p className="text-gray-400 mb-6">Community savings, reimagined</p>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} MiTurn. All rights reserved.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
