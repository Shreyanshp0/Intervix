import React from 'react';
import { cn } from '../../utils/cn';

const Avatar = ({
  src,
  name = 'User',
  size = 'md', // 'sm' | 'md' | 'lg'
  className,
  ...props
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={cn(
        'rounded-full border border-white/10 flex items-center justify-center font-bold tracking-tight select-none bg-gradient-to-br from-primary to-accent text-white flex-shrink-0',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <span>{initials || 'U'}</span>
      )}
    </div>
  );
};

export default Avatar;
