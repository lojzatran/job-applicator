'use client';

import Link from 'next/link';

interface ApplicationsHeaderProps {
  count: number;
}

export const ApplicationsHeader = ({ count }: ApplicationsHeaderProps) => {
  return (
    <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <Link 
          href="/" 
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
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
      
      <div className="rounded-2xl bg-white/50 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur-sm dark:bg-slate-900/50 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800">
        {count} Applications Total
      </div>
    </div>
  );
};
