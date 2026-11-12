import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CancelProcessingRunButton } from './CancelProcessingRunButton';
import { useJobProcessingRun } from '../hooks/useJobProcessingRun';
import { PROCESSING_RUN_STALE_AFTER_MS } from '../utils/processing-run';
import type { JobApplicationProcessingRun } from '../types/job-processing-run';

jest.mock('../hooks/useJobProcessingRun', () => ({
  useJobProcessingRun: jest.fn(),
}));

const useProcessingRun = jest.mocked(useJobProcessingRun);
const setProcessingRun = jest.fn();
const originalFetch = global.fetch;
const now = Date.parse('2026-11-12T12:00:00Z');
let processingRun: JobApplicationProcessingRun;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  global.fetch = jest.fn();
  processingRun = {
    id: 1,
    threadId: 'test-thread',
    status: 'pending',
    lastUpdatedAt: new Date(
      now - PROCESSING_RUN_STALE_AFTER_MS - 1,
    ).toISOString(),
    totalJobs: 0,
    evaluatedJobApplications: 0,
    dismissedJobApplications: 0,
    appliedJobApplications: 0,
  };
  useProcessingRun.mockImplementation(() => ({
    jobProcessingRun: processingRun,
    setJobProcessingRun: setProcessingRun,
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

it.each(['pending', 'in progress'] as const)(
  'shows Cancel Run for a stale %s run',
  (status) => {
    processingRun.status = status;
    render(<CancelProcessingRunButton />);

    expect(screen.getByRole('button', { name: 'Cancel Run' })).toBeTruthy();
  },
);

it.each(['completed', 'failed'] as const)(
  'does not show Cancel Run for a %s run',
  (status) => {
    processingRun.status = status;
    render(<CancelProcessingRunButton />);

    expect(screen.queryByRole('button')).toBeNull();
  },
);

it('shows the button after polling crosses the inactivity limit and hides it after progress', () => {
  processingRun.lastUpdatedAt = new Date(now).toISOString();
  const { rerender } = render(<CancelProcessingRunButton />);
  expect(screen.queryByRole('button')).toBeNull();

  jest.mocked(Date.now).mockReturnValue(now + PROCESSING_RUN_STALE_AFTER_MS);
  rerender(<CancelProcessingRunButton />);
  expect(screen.queryByRole('button')).toBeNull();

  jest
    .mocked(Date.now)
    .mockReturnValue(now + PROCESSING_RUN_STALE_AFTER_MS + 1);
  rerender(<CancelProcessingRunButton />);
  expect(screen.getByRole('button', { name: 'Cancel Run' })).toBeTruthy();

  processingRun.lastUpdatedAt = new Date(Date.now()).toISOString();
  rerender(<CancelProcessingRunButton />);
  expect(screen.queryByRole('button')).toBeNull();
});

it('updates the shared run state after cancellation', async () => {
  const cancelledRun = { ...processingRun, status: 'failed' };
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => cancelledRun,
  } as Response);
  render(<CancelProcessingRunButton />);

  fireEvent.click(screen.getByRole('button', { name: 'Cancel Run' }));

  await waitFor(() =>
    expect(setProcessingRun).toHaveBeenCalledWith(cancelledRun),
  );
  expect(fetch).toHaveBeenCalledWith('/api/runs/test-thread/cancel', {
    method: 'POST',
  });
});

it('keeps the run active and shows an error when cancellation is rejected', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false, status: 409 } as Response);
  render(<CancelProcessingRunButton />);

  fireEvent.click(screen.getByRole('button', { name: 'Cancel Run' }));

  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(setProcessingRun).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Cancel Run' })).toHaveProperty(
    'disabled',
    false,
  );
});
