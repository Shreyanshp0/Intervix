import React from 'react';
import { cn } from '../../utils/cn';

const Select = React.forwardRef(({
  className,
  label,
  error,
  options = [],
  ...props
}, ref) => {
  return (
    <div className="w-full relative">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          ref={ref}
          className={cn(
            "flex w-full rounded-xl border border-white/10 bg-[#1A1F2C]/50 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-[#1A1F2C]/80 transition-all duration-300",
            "appearance-none cursor-pointer pr-10",
            error && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0E1424] text-gray-200">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
          ▼
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
