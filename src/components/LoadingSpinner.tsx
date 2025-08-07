
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: "small" | "medium" | "large";
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  fullScreen = false,
  size = "medium" 
}) => {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4"
  };

  return (
    <div className={cn(
      "flex items-center justify-center",
      fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
    )}>
      <div 
        className={cn(
          "border-t-primary animate-spin rounded-full border-background",
          sizeClasses[size]
        )}
      />
    </div>
  );
};

export default LoadingSpinner;
