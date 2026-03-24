'use client';

interface StartupJobsToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const StartupJobsToggle = ({
  enabled,
  onToggle,
}: StartupJobsToggleProps) => {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-stone-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition-transform group-hover:scale-110 dark:bg-slate-900 dark:ring-slate-700 sm:h-10 sm:w-10">
          <img
            src="/startupjobs-32x32.png"
            alt=""
            aria-hidden="true"
            className="h-4 w-4 sm:h-5 sm:w-5"
          />
        </div>
        <div>
          <label
            htmlFor="startupjobs-toggle"
            className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200 sm:text-base"
          >
            StartupJobs
          </label>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:text-xs">
            Auto-sync profile
          </p>
        </div>
      </div>

      <button
        id="startupjobs-toggle"
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 sm:h-7 sm:w-12 ${
          enabled ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
        }`}
        aria-pressed={enabled}
        aria-label="Toggle StartupJobs auto-sync"
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
