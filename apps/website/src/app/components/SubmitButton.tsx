'use client';

interface SubmitButtonProps {
  isUploading: boolean;
}

export const SubmitButton = ({ isUploading }: SubmitButtonProps) => {
  return (
    <button
      type="submit"
      disabled={isUploading}
      className="group flex w-full items-center justify-center space-x-3 overflow-hidden rounded-2xl bg-slate-900 py-3.5 font-bold text-white shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:py-4"
    >
      <span className="relative z-10 text-sm sm:text-base">
        {isUploading ? 'Uploading Resume...' : 'Prepare Application Pack'}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="h-4 w-4 transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
};
