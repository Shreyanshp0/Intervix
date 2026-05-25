import { Sparkles } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Sparkles size={22} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;
