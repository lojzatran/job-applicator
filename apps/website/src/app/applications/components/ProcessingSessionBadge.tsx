import { JobProcessingRunStatus } from '../../types/job-processing-run';

interface ProcessingSessionBadgeProps {
  jobProcessingRun: {
    status: JobProcessingRunStatus;
  };
}

export const ProcessingSessionBadge = ({
  jobProcessingRun,
}: ProcessingSessionBadgeProps) => {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/80 px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-100 backdrop-blur-sm dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-sm transition-all hover:bg-emerald-100/50 dark:hover:bg-emerald-500/20">
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${jobProcessingRun.status === 'completed' ? 'bg-blue-400' : jobProcessingRun.status === 'failed' ? 'bg-red-400' : 'bg-emerald-400'} opacity-75`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${jobProcessingRun.status === 'completed' ? 'bg-blue-500' : jobProcessingRun.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`}
        ></span>
      </span>
      <span className="uppercase tracking-wider text-[0.65rem] opacity-60">
        Session:
      </span>
      {jobProcessingRun.status.charAt(0).toUpperCase() +
        jobProcessingRun.status.slice(1)}
    </div>
  );
};
