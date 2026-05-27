import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const Tabs = ({
  tabs = [], // array of { value, label, icon: Icon }
  activeTab,
  onChange,
  className
}) => {
  return (
    <div className={cn("flex border-b border-white/5 bg-white/[0.005]", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "pb-2.5 px-1 text-xs font-semibold relative transition-colors flex items-center gap-1.5",
              isActive ? "text-white" : "text-gray-400 hover:text-white"
            )}
          >
            {Icon && <Icon size={13} />}
            <span>{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
