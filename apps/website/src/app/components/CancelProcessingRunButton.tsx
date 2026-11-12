'use client';

import { useState } from 'react';
import { useJobProcessingRun } from '../hooks/useJobProcessingRun';
import { PROCESSING_RUN_STALE_AFTER_MS } from '../utils/processing-run';
import type { JobApplicationProcessingRun } from '../types/job-processing-run';

export const CancelProcessingRunButton = () => {
  const { jobProcessingRun, setJobProcessingRun } = useJobProcessingRun();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState('');

  const canCancel =
    jobProcessingRun &&
    (jobProcessingRun.status === 'pending' ||
      jobProcessingRun.status === 'in progress') &&
    Date.now() - Date.parse(jobProcessingRun.lastUpdatedAt) >
      PROCESSING_RUN_STALE_AFTER_MS;

  const cancelRun = async () => {
    if (!jobProcessingRun) return;

    setIsCancelling(true);
    setError('');

    try {
      const response = await fetch(
        `/api/runs/${jobProcessingRun.threadId}/cancel`,
        {
          method: 'POST',
        },
      );
      if (!response.ok)
        throw new Error('Unable to cancel this run. Please try again.');

      const cancelledRun: JobApplicationProcessingRun = await response.json();
      setJobProcessingRun(cancelledRun);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to cancel this run.',
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (!canCancel) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void cancelRun()}
        disabled={isCancelling}
        className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus-visible:ring-offset-slate-900"
      >
        {isCancelling ? 'Cancelling...' : 'Cancel Run'}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
};
