import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export function Logo({ className = "w-full h-full", size }: LogoProps) {
  const style = size ? { width: size, height: size } : {};
  
  return (
    <svg 
      viewBox="0 0 200 200" 
      width="200"
      height="200"
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={style}
    >
      {/* Background/Shadow for depth */}
      <circle cx="100" cy="110" r="70" fill="black" fillOpacity="0.05" />
      
      {/* Blue Water Drop */}
      <path 
        d="M100 15C100 15 50 70 50 120C50 153.137 72.3858 180 100 180C127.614 180 150 153.137 150 120C150 70 100 15 100 15Z" 
        fill="#3B82F6"
      />
      
      {/* Green Leaf component */}
      <path 
        d="M100 15C135 15 170 55 170 120C170 155 145 180 100 180V15Z" 
        fill="#10B981"
      />
      
      {/* Veins of the leaf */}
      <path d="M100 60C120 70 140 100 145 130" stroke="white" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 90C120 100 135 120 140 145" stroke="white" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      
      {/* Lightning Bolt (Industry/Energy) */}
      <path 
        d="M115 45L80 105H110L75 165L125 95H95L115 45Z" 
        fill="#F97316" 
        stroke="white" 
        strokeWidth="3"
        strokeLinejoin="round" 
      />
    </svg>
  );
}
