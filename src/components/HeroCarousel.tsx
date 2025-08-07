
import React, { useEffect, useState } from "react";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Users, CircleDollarSign, Shield, PiggyBank, Calendar } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const features = [
  {
    title: "Create Your Circle",
    description: "Start a savings circle with friends, family, or colleagues",
    icon: <Users className="h-12 w-12 text-primary mb-4" />,
    color: "bg-blue-100"
  },
  {
    title: "Set Contribution Amount",
    description: "Everyone contributes an equal amount on a schedule",
    icon: <CircleDollarSign className="h-12 w-12 text-indigo-500 mb-4" />,
    color: "bg-indigo-100"
  },
  {
    title: "Secure Payouts",
    description: "Each member receives the pool in a fair rotation",
    icon: <PiggyBank className="h-12 w-12 text-purple-500 mb-4" />,
    color: "bg-purple-100"
  },
  {
    title: "Schedule Payments",
    description: "Automated transfers ensure everyone contributes on time",
    icon: <Calendar className="h-12 w-12 text-green-500 mb-4" />,
    color: "bg-green-100"
  },
  {
    title: "Bank-Level Security",
    description: "Your data and money are protected with encryption",
    icon: <Shield className="h-12 w-12 text-amber-500 mb-4" />,
    color: "bg-amber-100"
  }
];

const HeroCarousel = () => {
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  
  useEffect(() => {
    trackEvent('hero_carousel_viewed');
  }, []);

  // Handle slide change from button clicks
  const handleSlideChange = (index: number) => {
    if (api) {
      api.scrollTo(index);
    }
    setActiveIndex(index);
    trackEvent(`hero_slide_${index + 1}_viewed`);
  };
  
  // Update active index when carousel changes
  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    
    // Cleanup
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);
  
  return (
    <div className="w-full max-w-5xl mx-auto">
      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none">
        How MiTurn Works
      </Badge>
      
      <Carousel 
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
      >
        <CarouselContent>
          {features.map((feature, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3" onClick={() => handleSlideChange(index)}>
              <div className={`h-full rounded-xl ${feature.color} p-8 flex flex-col items-center text-center animate-fade-in transition-all duration-300 hover:scale-[1.02]`}>
                {feature.icon}
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <div className="flex flex-col gap-2 mt-6">
          {/* Navigation dashes */}
          <div className="flex items-center justify-center gap-2">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSlideChange(index)}
                className={`h-1 transition-all duration-300 ${
                  activeIndex === index ? "w-8 bg-primary" : "w-4 bg-gray-300"
                } rounded-full`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Arrow navigation */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <CarouselPrevious className="static translate-y-0 mx-1" />
            <CarouselNext className="static translate-y-0 mx-1" />
          </div>
        </div>
      </Carousel>
      
      <div className="flex justify-center mt-8 group">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute -inset-px animate-pulse rounded-full bg-gradient-to-r from-primary to-purple-600 opacity-70 blur-sm group-hover:opacity-100 transition duration-1000"></div>
          <a 
            href="#features" 
            className="relative rounded-full bg-white px-6 py-3 text-base font-medium text-gray-800 shadow-md hover:shadow-lg transition-all duration-300"
            onClick={() => trackEvent('learn_more_cta_clicked')}
          >
            Learn more about how it works
          </a>
        </div>
      </div>
    </div>
  );
};

export default HeroCarousel;
