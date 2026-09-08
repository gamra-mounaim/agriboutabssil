import React from 'react';
import { SHOP_DETAILS } from '../constants';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export function Logo({ className = "w-full h-full object-contain", size }: LogoProps) {
  const style = size ? { width: size, height: typeof size === 'number' ? `${size}px` : size } : {};
  
  return (
    <img 
      src={SHOP_DETAILS.logo} 
      alt="AGRI BOUTABSSIL" 
      className={className} 
      style={style}
    />
  );
}
