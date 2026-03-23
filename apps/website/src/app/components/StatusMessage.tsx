'use client';

type StatusMessageProps = {
  tone: 'error' | 'success';
  message: string;
};

export const StatusMessage = ({ tone, message }: StatusMessageProps) => {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        tone === 'error'
          ? 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200'
          : 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
      }
    >
      {message}
    </p>
  );
};
