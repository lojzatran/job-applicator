'use client';

import Link from 'next/link';
import { useJobProcessingRun } from '../../hooks/useJobProcessingRun';

interface ApplicationsHeaderProps {
  count: number;
}

export const ApplicationsHeader = ({ count }: ApplicationsHeaderProps) => {
  const { jobProcessingRun } = useJobProcessingRun();
  return (
    <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="bg-gradient-to-r from-emerald-700 to-teal-500 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-emerald-300 dark:to-cyan-300 sm:text-5xl">
          My Applications
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Tracking your personalized job application journey
        </p>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="group rounded-2xl bg-white/50 px-4 py-2 text-sm font-bold text-slate-600 backdrop-blur-sm dark:bg-slate-900/50 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:border-slate-200 dark:hover:border-slate-700">
            <span className="text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 inline-block">
              {count}
            </span>
            <span className="ml-1.5 opacity-80 uppercase tracking-tight text-[0.7rem]">
              Total Apps
            </span>
          </div>
        </div>

        <div aria-live="polite" aria-atomic="true" className="flex flex-col items-end gap-3">
          {jobProcessingRun && (
            <>
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

              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-700">
                {/* Evaluated */}
                <div className="flex items-center gap-1.5 rounded-xl bg-blue-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-blue-700 border border-blue-100/50 dark:bg-blue-500/5 dark:text-blue-400 dark:border-blue-500/10">
                  <span className="opacity-60 uppercase tracking-tight">
                    Evaluated
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
                    {jobProcessingRun.evaluatedJobApplications}
                  </span>
                </div>

                {/* Applied */}
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-emerald-700 border border-emerald-100/50 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/10">
                  <span className="opacity-60 uppercase tracking-tight">
                    Applied
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
                    {jobProcessingRun.appliedJobApplications}
                  </span>
                </div>

                {/* Dismissed */}
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-50/50 px-3 py-1.5 text-[0.75rem] font-bold text-slate-600 border border-slate-100/50 dark:bg-slate-500/5 dark:text-slate-400 dark:border-slate-500/10">
                  <span className="opacity-60 uppercase tracking-tight">
                    Dismissed
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-500/20 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
                    {jobProcessingRun.dismissedJobApplications}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
