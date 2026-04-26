import { JobApplication } from '../applications/types';

type Status = JobApplication['status'];

const statusConfig: Record<
  Status,
  { bg: string; text: string; dot: string; pulse: boolean }
> = {
  processing: {
    bg: 'bg-amber-100 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    pulse: true,
  },
  dismissed: {
    bg: 'bg-red-100 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    pulse: false,
  },
  applied: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    pulse: false,
  },
};

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.text}`}
    >
      <div
        className={`h-1.5 w-1.5 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`}
      />
      {status}
    </span>
  );
};
