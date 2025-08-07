
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import HeroImage from "./HeroImage";
import HeroCarousel from "./HeroCarousel";

interface HeroProps {
  scrollToFeatures: () => void;
}

const Hero: React.FC<HeroProps> = ({ scrollToFeatures }) => {
  const handleButtonClick = (eventName: string) => {
    trackEvent(eventName);
  };

  return (
    <div className="relative flex flex-col items-center px-6 py-20 md:py-28 md:px-12 lg:px-24 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto w-full">
        {/* Hero section with enhanced typography and layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-24">
          <div className="w-full lg:w-1/2 max-w-2xl mb-16 lg:mb-0">
            {/* Main headline with bold, human-centered messaging */}
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900 leading-tight">
                Community savings,{" "}
                <span className="text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  reimagined
                </span>
              </h1>
              
              {/* Enhanced supportive sub-text */}
              <p className="text-xl md:text-2xl text-gray-600 mb-4 leading-relaxed">
                Whether you're saving solo or in a group, MiTurn automates your contributions so you hit your goals without thinking about it.
              </p>
              
              <p className="text-lg text-gray-500 mb-8">
                Join thousands building their financial future together.
              </p>
            </div>
            
            {/* Enhanced CTAs with better styling */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                asChild 
                onClick={() => handleButtonClick('hero_get_started_click')}
                className="relative overflow-hidden group bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/signup">
                  <span className="absolute inset-0 w-0 bg-white/20 transition-all duration-300 ease-out group-hover:w-full rounded-full"></span>
                  <span className="relative flex items-center">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => {
                  scrollToFeatures();
                  handleButtonClick('hero_learn_more_click');
                }}
                className="border-2 border-gray-300 hover:border-primary hover:bg-primary/5 text-gray-700 hover:text-primary font-semibold px-8 py-4 text-lg rounded-full transition-all duration-300"
                aria-label="Learn more about MiTurn features"
              >
                Learn More
              </Button>
            </div>
          </div>
          
          {/* Enhanced hero image container */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Subtle background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-full blur-3xl opacity-30"></div>
              <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
                <HeroImage />
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced carousel section */}
        <div className="w-full mt-12">
          <HeroCarousel />
        </div>
      </div>
    </div>
  );
};

export default Hero;
