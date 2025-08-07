
import React, { ReactNode } from "react";
import { motion, type Transition } from "framer-motion";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

interface AnimatedPageWrapperProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 50,
    scale: 0.98
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    x: -50,
    scale: 0.98
  }
};

const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};

const AnimatedPageWrapper: React.FC<AnimatedPageWrapperProps> = ({ children }) => {
  const location = useLocation();

  React.useEffect(() => {
    // Track page transition complete
    const timer = setTimeout(() => {
      trackEvent('page_transition_complete', { route: location.pathname });
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen flex flex-col"
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPageWrapper;
