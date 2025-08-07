
import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleUser, CalendarClock, Repeat, ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackEvent('feature_card_viewed', { feature: title });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, [title]);
  
  const getIcon = () => {
    const iconProps = { className: "h-12 w-12 text-primary" };
    switch (icon) {
      case "circle-users":
        return <CircleUser {...iconProps} />;
      case "calendar-clock":
        return <CalendarClock {...iconProps} />;
      case "repeat":
        return <Repeat {...iconProps} />;
      case "shield-check":
        return <ShieldCheck {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileFocus={{ 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeOut",
        delay: 0.1 
      }}
      viewport={{ once: true, margin: "-50px" }}
      style={{ willChange: "transform" }}
    >
      <Card 
        className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2"
        tabIndex={0}
        role="article"
        aria-labelledby={`feature-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {/* Gradient background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <CardHeader className="relative z-10 flex flex-col items-center text-center space-y-4 pt-8">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-4 bg-primary/10 rounded-2xl"
          >
            {getIcon()}
          </motion.div>
          <CardTitle 
            id={`feature-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-2xl font-bold leading-tight tracking-tight text-gray-900"
          >
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10 text-center pb-8">
          <CardDescription className="text-base text-gray-600 leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FeatureCard;
