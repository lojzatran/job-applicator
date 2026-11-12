'use client';

import type { ProcessingRunQuota } from '../types/processing-run-quota';

interface ProcessingRunQuotaStatusProps {
  quota: ProcessingRunQuota | null;
  error: string;
  onRetry: () => void;
}

export const ProcessingRunQuotaStatus = ({
  quota,
  error,
  onRetry,
}: ProcessingRunQuotaStatusProps) => (
  <div
    role="status"
    aria-live="polite"
    className="mb-6 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
  >
    {error ? (
      <p>
        {error}{' '}
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold underline underline-offset-4 hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
        >
          Retry
        </button>
      </p>
    ) : quota ? (
      <>
        <div className="flex items-center justify-between gap-4">
          <p>
            <strong className="font-semibold text-slate-900 dark:text-white">
              {quota.remaining} of {quota.limit}
            </strong>{' '}
            runs remaining
          </p>
          <div aria-hidden="true" className="flex gap-1">
            {Array.from({ length: quota.limit }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-3 rounded-full ${index < quota.remaining ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {quota.remaining === 0 && quota.nextAvailableAt ? (
            <>
              Limit reached. Next run available{' '}
              <time dateTime={quota.nextAvailableAt}>
                {new Date(quota.nextAvailableAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
              .
            </>
          ) : (
            'Your allowance covers the last 24 hours.'
          )}
        </p>
      </>
    ) : (
      <p>Checking run allowance...</p>
    )}
  </div>
);
