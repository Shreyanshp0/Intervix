export const matchToneClass = (score = 0) => {
  if (score >= 80) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (score >= 55) return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
};

export const stageToneClass = (stage = '') => {
  const map = {
    Applied: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
    Shortlisted: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    'Interview Scheduled': 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
    Passed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    Rejected: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    Hired: 'border-violet-400/20 bg-violet-400/10 text-violet-200'
  };

  return map[stage] || 'border-white/10 bg-white/5 text-gray-200';
};
