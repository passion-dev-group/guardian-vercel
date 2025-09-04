import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  BarChart3, 
  Users, 
  Target, 
  PlusCircle, 
  UserCircle,
  Settings,
  Banknote,
  DollarSign,
  LogOut,
  CreditCard,
  Gift
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const NavigationTabs: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tabName: string, path: string) => {
    trackEvent('navigation_tab_clicked', { tab: tabName, path });
  };

  const handleLogout = async () => {
    trackEvent('logout_clicked', { location: 'main_navigation' });
    await signOut();
  };

  // Define tabs based on user authentication status
  const tabs = user ? [
    // { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Savings Goals', path: '/savings-goals', icon: Target },
    { name: 'Create Circle', path: '/create-circle', icon: PlusCircle },
    { name: 'Social Feed', path: '/feed', icon: Users },
    { name: 'Referrals', path: '/referrals', icon: Gift },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'My Plan', path: '/pricing', icon: CreditCard },
    { name: 'Profile', path: '/profile', icon: UserCircle },
    { name: 'Link Bank', path: '/link-bank', icon: Banknote },
  ] : [
    { name: 'About', path: '/about', icon: Home },
    { name: 'Pricing', path: '/pricing', icon: DollarSign },
    { name: 'Sign Up', path: '/signup', icon: UserCircle },
    { name: 'Sign In', path: '/login', icon: Settings },
  ];

  return (
    <motion.div 
      className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/" 
              className="text-2xl font-bold text-primary"
              onClick={() => handleTabClick('home', '/')}
            >
              MiTurn
            </Link>
          </motion.div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1" role="tablist">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              const Icon = tab.icon;
              
              return (
                <motion.div key={tab.name} className="relative">
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      to={tab.path}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                      }`}
                      onClick={() => handleTabClick(tab.name.toLowerCase().replace(' ', '_'), tab.path)}
                      aria-current={isActive ? 'page' : undefined}
                      role="tab"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span>{tab.name}</span>
                    </Link>
                  </motion.div>
                  
                  {/* Active tab indicator */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </motion.div>
              );
            })}
            
            {/* Logout Button for authenticated users */}
            {user && (
              <motion.div className="relative">
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                    role="tab"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </nav>

          {/* Mobile Navigation Toggle */}
          <div className="md:hidden">
            <motion.button
              className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-primary/5"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <motion.div 
          id="mobile-menu"
          className="md:hidden border-t border-gray-200 py-2 overflow-hidden"
          initial={false}
          animate={{
            height: isMobileMenuOpen ? 'auto' : 0,
            opacity: isMobileMenuOpen ? 1 : 0,
            pointerEvents: isMobileMenuOpen ? 'auto' : 'none',
          }}
          transition={{ duration: 0.3 }}
          style={{ display: isMobileMenuOpen ? 'block' : 'block' }}
        >
          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              const Icon = tab.icon;
              
              return (
                <motion.div key={tab.name}>
                  <Link
                    to={tab.path}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                    }`}
                    onClick={() => {
                      handleTabClick(tab.name.toLowerCase().replace(' ', '_'), tab.path);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{tab.name}</span>
                  </Link>
                </motion.div>
              );
            })}
            
            {/* Mobile Logout Button for authenticated users */}
            {user && (
              <motion.div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default NavigationTabs;
