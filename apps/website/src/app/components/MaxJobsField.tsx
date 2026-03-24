'use client';

interface MaxJobsFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export const MaxJobsField = ({ value, onChange }: MaxJobsFieldProps) => {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-stone-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label
            htmlFor="max-jobs"
            className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200 sm:text-base"
          >
            Max applied jobs
          </label>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:text-xs">
            Limit how many jobs are successfully applied
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          integer
        </div>
      </div>

      <input
        id="max-jobs"
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
};
