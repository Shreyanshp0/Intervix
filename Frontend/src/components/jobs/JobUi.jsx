import { cn } from '../../utils/cn';
import { matchToneClass, stageToneClass } from '../../utils/jobUi';

export const Panel = ({ className, children }) => (
  <div className={cn('rounded-2xl border border-white/5 bg-glass backdrop-blur-md shadow-2xl relative overflow-hidden p-6', className)}>
    {children}
  </div>
);

export const MatchBadge = ({ score }) => (
  <div className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider select-none', matchToneClass(score))}>
    {score}% Match
  </div>
);

export const StageBadge = ({ stage }) => (
  <div className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider select-none', stageToneClass(stage))}>
    {stage}
  </div>
);

export const TextareaField = ({ label, className, ...props }) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</label>
    <textarea
      className="min-h-[120px] w-full rounded-xl border border-white/10 bg-[#1A1F2C]/50 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-[#1A1F2C]/80 transition-all duration-300"
      {...props}
    />
  </div>
);

export const StatPill = ({ label, value, tone = 'default' }) => {
  const toneClasses = {
    default: 'border-white/5 bg-white/[0.01] text-white',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    accent: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100'
  };

  return (
    <div className={cn('rounded-2xl border px-4 py-3 select-none', toneClasses[tone] || toneClasses.default)}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="mt-2 text-lg font-extrabold">{value}</div>
    </div>
  );
};
