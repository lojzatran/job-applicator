'use client';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export const ThemeToggle = ({ isDarkMode, onToggle }: ThemeToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-3"
      aria-label="Toggle Dark Mode"
    >
      {isDarkMode ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5 text-emerald-700 sm:h-6 sm:w-6"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};
