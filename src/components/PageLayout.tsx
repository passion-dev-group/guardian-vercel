
import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import AnimatedHeader from "@/components/AnimatedHeader";
import { motion } from "framer-motion";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedHeader />
      
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="container py-6 px-4 sm:px-6 space-y-6">
          {children}
        </div>
      </motion.main>
      
      <motion.footer 
        className="border-t py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="container px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">© 2024 MiTurn. All rights reserved.</div>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link to="/terms" className="text-xs text-muted-foreground hover:underline">Terms</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:underline">Privacy</Link>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default PageLayout;
