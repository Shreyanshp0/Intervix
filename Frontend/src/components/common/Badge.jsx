import React from 'react';
import { cn } from '../../utils/cn';

const Badge = ({
  className,
  variant = 'brand', // 'brand' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  children,
  ...props
}) => {

  const variants = {
    brand: 'bg-primary/10 border-primary/20 text-indigo-300',
    secondary: 'bg-white/5 border-white/10 text-gray-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
