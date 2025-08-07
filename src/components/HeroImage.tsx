
import { useState, useEffect } from "react";

const HeroImage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [hoverNode, setHoverNode] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/hero-image.svg";
    img.onload = () => setIsLoaded(true);
    
    // Auto-cycle through nodes for animation effect
    const interval = setInterval(() => {
      setActiveNode(prev => {
        if (prev === null || prev >= 3) return 0;
        return prev + 1;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const nodePositions = [
    {x: 250, y: 100, color: "#6366F1", text: "Start Circle"},
    {x: 400, y: 250, color: "#8B5CF6", text: "Monthly Contribution"},
    {x: 250, y: 400, color: "#EC4899", text: "Receive Payout"},
    {x: 100, y: 250, color: "#10B981", text: "Complete Cycle"}
  ];

  return (
    <div className="relative w-full max-w-md aspect-square">
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      
      <svg
        viewBox="0 0 500 500"
        className={`w-full h-full transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Background circles */}
        <circle cx="250" cy="250" r="200" fill="#F3F4F6" />
        <circle cx="250" cy="250" r="150" fill="#E5E7EB" />
        <circle cx="250" cy="250" r="100" fill="#D1D5DB" />
        <circle cx="250" cy="250" r="50" fill="#9CA3AF" />
        
        {/* Connect lines */}
        {nodePositions.map((node, i) => (
          <line 
            key={`line-${i}`}
            x1={node.x} 
            y1={node.y} 
            x2="250" 
            y2="250" 
            stroke={activeNode === i || hoverNode === i ? node.color : "#9CA3AF"} 
            strokeWidth={activeNode === i || hoverNode === i ? "6" : "4"} 
            strokeOpacity={activeNode === i || hoverNode === i ? "0.8" : "0.5"}
            className="transition-all duration-500"
          />
        ))}
        
        {/* Nodes */}
        {nodePositions.map((node, i) => (
          <g 
            key={`node-${i}`}
            onMouseEnter={() => setHoverNode(i)}
            onMouseLeave={() => setHoverNode(null)}
            className="cursor-pointer"
            onClick={() => setActiveNode(i)}
          >
            <circle 
              cx={node.x} 
              cy={node.y} 
              r={activeNode === i || hoverNode === i ? "35" : "30"}
              fill={node.color}
              className="transition-all duration-300"
            />
            <text 
              x={node.x} 
              y={node.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill="white" 
              fontSize={activeNode === i || hoverNode === i ? "16" : "14"}
              fontWeight="bold"
              className="pointer-events-none transition-all duration-300"
            >
              $
            </text>
            
            {/* Tooltip */}
            <g 
              opacity={activeNode === i || hoverNode === i ? 1 : 0}
              className="transition-opacity duration-300"
            >
              <rect 
                x={node.x - 70} 
                y={node.y + 40} 
                width="140" 
                height="30" 
                rx="15" 
                fill="white" 
                stroke={node.color}
                strokeWidth="2"
              />
              <text 
                x={node.x} 
                y={node.y + 55} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill="#333"
                fontSize="12"
                fontWeight="medium"
              >
                {node.text}
              </text>
            </g>
          </g>
        ))}
        
        {/* Center node */}
        <circle cx="250" cy="250" r="40" fill="#4F46E5">
          <animate 
            attributeName="opacity" 
            values="0.7;1;0.7" 
            dur="3s" 
            repeatCount="indefinite" 
          />
        </circle>
        <text 
          x="250" 
          y="250" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fill="white" 
          fontSize="13"
          fontWeight="bold"
        >
          MiTurn
        </text>
      </svg>
    </div>
  );
};

export default HeroImage;
