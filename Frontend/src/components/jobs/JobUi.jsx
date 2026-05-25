import { cn } from '../../utils/cn';
import { matchToneClass, stageToneClass } from '../../utils/jobUi';

export const Panel = ({ className, children }) => (
  <div className={cn('glass-card rounded-[28px] p-6 lg:p-8', className)}>
    {children}
  </div>
);

export const MatchBadge = ({ score }) => (
  <div className={cn('inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium', matchToneClass(score))}>
    {score}% Match
  </div>
);

export const StageBadge = ({ stage }) => (
  <div className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]', stageToneClass(stage))}>
    {stage}
  </div>
);

export const TextareaField = ({ label, className, ...props }) => (
  <div className={cn('space-y-2', className)}>
    <label className="text-sm font-medium text-gray-300">{label}</label>
    <textarea
      className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-surface/50 px-4 py-3 text-sm text-gray-100 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      {...props}
    />
  </div>
);

export const StatPill = ({ label, value, tone = 'default' }) => {
  const toneClasses = {
    default: 'border-white/10 bg-white/5 text-white',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    accent: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    warning: 'border-amber-400/20 bg-amber-400/10 text-amber-100'
  };

  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClasses[tone] || toneClasses.default)}>
      <div className="text-xs uppercase tracking-[0.22em] text-gray-400">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
};
