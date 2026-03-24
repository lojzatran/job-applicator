'use client';

interface LinkedInToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const LinkedInToggle = ({
  enabled,
  onToggle,
}: LinkedInToggleProps) => {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-stone-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 transition-transform group-hover:scale-110 dark:bg-blue-900/20 sm:h-10 sm:w-10">
          <svg viewBox="0 0 24 24" fill="#0077b5" className="h-5 w-5 sm:h-6 sm:w-6">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </div>
        <div>
          <label
            htmlFor="linkedin-toggle"
            className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200 sm:text-base"
          >
            LinkedIn
          </label>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:text-xs">
            Auto-sync profile
          </p>
        </div>
      </div>

      <button
        id="linkedin-toggle"
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 sm:h-7 sm:w-12 ${
          enabled ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
        aria-pressed={enabled}
        aria-label="Toggle LinkedIn auto-sync"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 sm:h-5 sm:w-5 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
