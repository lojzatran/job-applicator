'use client';

import { useJobProcessingRun } from '../hooks/useJobProcessingRun';

const formatJobProcessingRunId = (jobProcessingRunId: string | number) => {
  const strId = String(jobProcessingRunId);
  if (strId.length <= 12) {
    return strId;
  }

  return `${strId.slice(0, 6)}…${strId.slice(-4)}`;
};

export const JobProcessingRunBadge = () => {
  const { jobProcessingRun } = useJobProcessingRun();
  const isActive = jobProcessingRun?.status === 'active';
  const formattedThreadId = jobProcessingRun?.threadId
    ? formatJobProcessingRunId(jobProcessingRun.threadId)
    : 'No active run';

  return (
    <div
      className="max-w-[14rem] rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none"
      aria-label={
        isActive
          ? `Active job processing run ${jobProcessingRun?.threadId}`
          : 'No active job processing run'
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isActive
              ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
              : 'bg-slate-400 dark:bg-slate-600'
          }`}
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          Job Run
        </span>
      </div>
      <p className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">
        {formattedThreadId}
      </p>
    </div>
  );
};
