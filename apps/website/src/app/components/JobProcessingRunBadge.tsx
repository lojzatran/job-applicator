'use client';

import { useJobProcessingRun } from '../hooks/useJobProcessingRun';
import { CancelProcessingRunButton } from './CancelProcessingRunButton';

const formatJobProcessingRunId = (jobProcessingRunId: string | number) => {
  const strId = String(jobProcessingRunId);
  if (strId.length <= 12) {
    return strId;
  }

  return `${strId.slice(0, 6)}…${strId.slice(-4)}`;
};

export const JobProcessingRunBadge = () => {
  const { jobProcessingRun } = useJobProcessingRun();
  const isActive =
    jobProcessingRun?.status === 'pending' ||
    jobProcessingRun?.status === 'in progress';
  const isFailed = jobProcessingRun?.status === 'failed';
  const formattedThreadId = jobProcessingRun?.threadId
    ? formatJobProcessingRunId(jobProcessingRun.threadId)
    : 'No active run';

  return (
    <div
      className="max-w-[14rem] rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none"
      role={isFailed ? 'alert' : 'status'}
      aria-live={isFailed ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="sr-only">
        {isActive
          ? `Active job processing run ${jobProcessingRun?.threadId}`
          : isFailed
            ? `Failed job processing run ${jobProcessingRun?.threadId}`
            : 'No active job processing run'}
      </span>
      <div className="flex items-center gap-2" aria-hidden="true">
        <span
          className={`h-2 w-2 rounded-full ${
            isFailed
              ? 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'
              : isActive
                ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                : 'bg-slate-400 dark:bg-slate-600'
          }`}
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          Job Run
        </span>
      </div>
      <p
        aria-hidden="true"
        className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200"
      >
        {formattedThreadId}
      </p>
      {isFailed && (
        <p className="mt-2 text-sm font-medium text-rose-700 dark:text-rose-300">
          Job processing failed. Please try again.
        </p>
      )}
      <CancelProcessingRunButton />
    </div>
  );
};
