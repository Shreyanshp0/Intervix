import React from 'react';
import { cn } from '../../utils/cn';

const LoadingSkeleton = ({
  className,
  variant = 'text', // 'text' | 'card' | 'circle'
  count = 1,
  ...props
}) => {

  const variants = {
    text: 'h-4 bg-white/5 rounded-md w-full animate-pulse',
    card: 'h-32 bg-white/5 rounded-2xl w-full border border-white/5 animate-pulse',
    circle: 'h-10 w-10 bg-white/5 rounded-full animate-pulse',
  };

  const items = Array.from({ length: count });

  return (
    <div className="space-y-2.5 w-full">
      {items.map((_, idx) => (
        <div
          key={idx}
          className={cn(
            variants[variant],
            className
          )}
          {...props}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
