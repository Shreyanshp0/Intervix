import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const Card = React.forwardRef(({
  className,
  children,
  hoverable = true,
  padding = 'lg', // 'none' | 'sm' | 'md' | 'lg'
  onClick,
  ...props
}, ref) => {

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = hoverable || onClick ? motion.div : 'div';

  return (
    <Component
      ref={ref}
      onClick={onClick}
      whileHover={hoverable || onClick ? { y: -3, scale: 1.005 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border border-white/5 bg-glass backdrop-blur-md shadow-2xl relative overflow-hidden',
        paddings[padding],
        onClick && 'cursor-pointer select-none active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

export default Card;
