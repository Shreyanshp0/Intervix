import React from 'react';
import { cn } from './Button';

const Input = React.forwardRef(({ className, label, error, icon: Icon, ...props }, ref) => {
  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex w-full rounded-xl border border-white/10 bg-surface/50 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-surface/80 transition-all duration-300",
            Icon && "pl-10",
            error && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
});
Input.displayName = 'Input';

export default Input;
