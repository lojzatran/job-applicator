'use client';

export const EmptyState = () => {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-6 rounded-full bg-slate-100 p-5 dark:bg-slate-800 shadow-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-10 w-10 text-slate-300 dark:text-slate-600">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No applications found</h3>
      <p className="max-w-[18rem] mt-2 text-sm text-slate-400 dark:text-slate-500 font-medium">
        Start your journey by uploading your resume on the dashboard.
      </p>
    </div>
  );
};
