/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from './route';
import { cancelStaleJobApplicationProcessingRun } from '../../../../lib/db/processing-run.repository';
import { createClient } from '../../../../lib/supabase/server';

jest.mock('../../../../lib/db/processing-run.repository', () => ({
  cancelStaleJobApplicationProcessingRun: jest.fn(),
}));

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

const cancelRun = jest.mocked(cancelStaleJobApplicationProcessingRun);
const createSupabaseClient = jest.mocked(createClient);

function mockUser(userId: string | null) {
  createSupabaseClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function cancelRequest() {
  return POST(
    new NextRequest('http://localhost/api/runs/test-thread/cancel', {
      method: 'POST',
    }),
    { params: Promise.resolve({ id: 'test-thread' }) },
  );
}

describe('POST /api/runs/[id]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser('test-user');
  });

  it('rejects unauthenticated requests without accessing the run', async () => {
    mockUser(null);

    const response = await cancelRequest();

    expect(response.status).toBe(401);
    expect(cancelRun).not.toHaveBeenCalled();
  });

  it('uses the authenticated user and returns the cancelled run', async () => {
    const processingRun = {
      threadId: 'test-thread',
      status: 'failed',
      lastUpdatedAt: new Date(),
    } as NonNullable<Awaited<ReturnType<typeof cancelRun>>>;
    cancelRun.mockResolvedValue(processingRun);

    const response = await cancelRequest();

    expect(cancelRun).toHaveBeenCalledWith('test-thread', 'test-user');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...processingRun,
      lastUpdatedAt: processingRun.lastUpdatedAt.toISOString(),
    });
  });

  it('returns 409 when the conditional update does not cancel a run', async () => {
    cancelRun.mockResolvedValue(null);

    const response = await cancelRequest();

    expect(response.status).toBe(409);
  });
});
