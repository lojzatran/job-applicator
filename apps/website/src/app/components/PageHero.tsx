'use client';

export const PageHero = () => {
  return (
    <header className="mb-8 text-center sm:mb-10">
      <div className="mb-4 inline-flex items-center justify-center rounded-3xl bg-emerald-600 p-3 shadow-2xl shadow-emerald-500/30 sm:mb-6 sm:p-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          className="h-6 w-6 sm:h-8 sm:w-8"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      </div>
      <h1 className="mb-2 bg-gradient-to-r from-emerald-700 to-teal-500 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-emerald-300 dark:to-cyan-300 sm:text-5xl">
        Job Applicator
      </h1>
      <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 sm:text-sm">
        Resume intake for your next application sprint
      </p>
    </header>
  );
};
