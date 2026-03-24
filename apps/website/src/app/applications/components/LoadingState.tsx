'use client';

export const LoadingState = () => {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-5 transition-opacity">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-emerald-500/20" />
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-xl shadow-emerald-500/20" />
      </div>
      <p className="text-sm font-semibold tracking-wide text-emerald-600/70 dark:text-emerald-400/70 animate-pulse">
        Retrieving your career history...
      </p>
    </div>
  );
};
