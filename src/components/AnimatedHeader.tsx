
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTier } from "@/hooks/useUserTier";
import { TierBadge } from "@/components/gamification/TierBadge";
import { 
  Settings, 
  MoreHorizontal,
  LogIn,
  PlusCircle,
  Info,
  HelpCircle,
  LogOut,
  ArrowLeft
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { AnimatePresence } from "framer-motion";

const MobileMenu = ({
  isOpen,
  navItems,
  user,
  userTier,
  getUserDisplayName,
  handleLogout,
  setIsMobileMenuOpen,
  trackEvent,
}) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        id="mobile-header-menu"
        className="sm:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 overflow-hidden"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'block' }}
      >
        <div className="flex flex-col gap-2 py-2">
          {user && (
            <div className="text-sm font-medium text-gray-600 px-2 pb-2">
              Hi, <span className="font-semibold text-primary">{getUserDisplayName()}</span>!
            </div>
          )}
          {navItems.map((item) => {
            const isActive = window.location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-600 hover:text-primary hover:bg-primary/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  trackEvent('page_transition_start', { route: item.path });
                }}
              >
                <span className="flex items-center">
                  {item.label}
                  {item.path === '/profile' && userTier && (
                    <div className="ml-2">
                      <TierBadge tier={userTier.tier} size="sm" showLabel={false} />
                    </div>
                  )}
                  {item.path === '/account' && (
                    <Settings className="h-4 w-4 ml-1" />
                  )}
                </span>
              </Link>
            );
          })}
          <div className="flex flex-col gap-1 mt-2">
            <Link to="/create-circle" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:text-primary hover:bg-primary/5 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              <span>Create Circle</span>
            </Link>
            <Link to="/about" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:text-primary hover:bg-primary/5 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
              <Info className="h-4 w-4 mr-2" />
              <span>About</span>
            </Link>
            <Link to="/help" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:text-primary hover:bg-primary/5 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
              <HelpCircle className="h-4 w-4 mr-2" />
              <span>Help</span>
            </Link>
            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 w-full transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log Out</span>
              </button>
            ) : (
              <Link to="/login" className="flex items-center px-3 py-2 rounded-lg text-sm font-medium hover:text-primary hover:bg-primary/5 transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                <LogIn className="h-4 w-4 mr-2" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const NavItem = ({ item, isActive, userTier }) => (
  <motion.div className="relative">
    <motion.div
      whileHover={{ y: -2 }}
      whileFocus={{ y: -2 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link 
        to={item.path} 
        className={`text-sm font-medium px-3 py-2 rounded-md transition-colors relative block ${
          isActive 
            ? 'text-primary bg-primary/10' 
            : 'text-gray-600 hover:text-primary hover:bg-primary/5'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative z-10 flex items-center">
          {item.label}
          {item.path === '/profile' && userTier && (
            <div className="ml-2">
              <TierBadge tier={userTier.tier} size="sm" showLabel={false} />
            </div>
          )}
          {item.path === '/account' && (
            <Settings className="h-4 w-4 ml-1" />
          )}
        </span>
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isActive ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      </Link>
    </motion.div>
  </motion.div>
);

const AnimatedHeader = () => {
  const { user, signOut } = useAuth();
  const { userTier } = useUserTier();
  const { profile } = useProfile();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  const getUserDisplayName = () => {
    let name = "there";
    
    if (profile?.display_name) {
      name = profile.display_name;
    } else if (user?.email) {
      name = user.email.split('@')[0];
    }
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const shouldShowBackButton = () => {
    const mainPages = ['/', '/dashboard', '/login', '/signup'];
    return !mainPages.includes(location.pathname);
  };

  const navItems = user ? [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/feed', label: 'Social' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/profile', label: 'Profile' },
    { path: '/account', label: 'Account' }
  ] : [
    { path: '/login', label: 'Login' },
    { path: '/signup', label: 'Sign Up' }
  ];

  return (
    <motion.header 
      className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center h-full">
          {shouldShowBackButton() && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.history.back()}
                className="mr-2" 
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Link to="/" className="font-bold text-xl">MiTurn</Link>
          </motion.div>
        </div>
        {user && (
          <motion.div 
            className="ml-4 text-sm font-medium text-gray-600 hidden sm:block"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Hi, <span className="font-semibold text-primary">{getUserDisplayName()}</span>!
          </motion.div>
        )}
        {/* Desktop Nav */}
        <nav className="ml-auto gap-1 items-center relative hidden sm:flex">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} isActive={location.pathname === item.path} userTier={userTier} />
          ))}
          <DropdownMenu onOpenChange={handleDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  aria-label="Dashboard Options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              {!user && (
                <DropdownMenuItem onClick={() => handleOptionSelect('sign_in')} asChild>
                  <Link to="/login" className="flex items-center cursor-pointer">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign In</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleOptionSelect('create_circle')} asChild>
                <Link to="/create-circle" className="flex items-center cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Create Circle</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOptionSelect('about')} asChild>
                <Link to="/about" className="flex items-center cursor-pointer">
                  <Info className="mr-2 h-4 w-4" />
                  <span>About</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOptionSelect('help')} asChild>
                <Link to="/help" className="flex items-center cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center text-red-500 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        {/* Mobile Hamburger Button */}
        <div className="ml-auto flex sm:hidden">
          <motion.button
            className="p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-primary/5"
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-header-menu"
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
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        navItems={navItems}
        user={user}
        userTier={userTier}
        getUserDisplayName={getUserDisplayName}
        handleLogout={handleLogout}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        trackEvent={trackEvent}
      />
    </motion.header>
  );
};

export default AnimatedHeader;
