import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (val: any, decimals: number = 2) => {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0.00';
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return parts.join('.');
};

