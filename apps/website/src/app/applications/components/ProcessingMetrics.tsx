interface ProcessingMetricsProps {
  jobProcessingRun: {
    evaluatedJobApplications: number;
    appliedJobApplications: number;
    dismissedJobApplications: number;
  };
}

export const ProcessingMetrics = ({
  jobProcessingRun,
}: ProcessingMetricsProps) => {
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Evaluated */}
      <div className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-blue-700 border border-blue-100/50 dark:bg-blue-500/5 dark:text-blue-400 dark:border-blue-500/10">
        <span className="opacity-60 uppercase tracking-tight">Evaluated</span>
        <span className="bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
          {jobProcessingRun.evaluatedJobApplications}
        </span>
      </div>

      {/* Applied */}
      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-emerald-700 border border-emerald-100/50 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/10">
        <span className="opacity-60 uppercase tracking-tight">Applied</span>
        <span className="bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
          {jobProcessingRun.appliedJobApplications}
        </span>
      </div>

      {/* Dismissed */}
      <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-slate-600 border border-slate-100/50 dark:bg-slate-500/5 dark:text-slate-400 dark:border-slate-500/10">
        <span className="opacity-60 uppercase tracking-tight">Dismissed</span>
        <span className="bg-slate-100 dark:bg-slate-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
          {jobProcessingRun.dismissedJobApplications}
        </span>
      </div>
    </div>
  );
};
