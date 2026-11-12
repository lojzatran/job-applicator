/**
 * @jest-environment node
 */

import { GET } from './route';
import { getJobApplication } from '../../../lib/db/db-client';
import { NextRequest } from 'next/server';

jest.mock('../../../lib/db/db-client', () => ({
  getJobApplication: jest.fn(),
}));

jest.mock('../../../lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: 'test-user' } },
      })),
    },
  })),
}));

const mockedGetJobApplication = getJobApplication as jest.Mock;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await GET(
      new NextRequest('http://localhost'),
      makeParams('abc'),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: 'Invalid id parameter' });
    expect(mockedGetJobApplication).not.toHaveBeenCalled();
  });

  it('returns 400 for Infinity', async () => {
    const res = await GET(
      new NextRequest('http://localhost'),
      makeParams('Infinity'),
    );
    expect(res.status).toBe(400);
    expect(mockedGetJobApplication).not.toHaveBeenCalled();
  });

  it('returns the application for a valid numeric id', async () => {
    const fakeApp = { id: 42, title: 'Engineer' };
    mockedGetJobApplication.mockResolvedValue(fakeApp);

    const res = await GET(
      new NextRequest('http://localhost'),
      makeParams('42'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeApp);
    expect(mockedGetJobApplication).toHaveBeenCalledWith(42, 'test-user');
  });

  it('returns 404 when the application is not found', async () => {
    mockedGetJobApplication.mockResolvedValue(null);

    const res = await GET(
      new NextRequest('http://localhost'),
      makeParams('99'),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: 'Application not found' });
    expect(mockedGetJobApplication).toHaveBeenCalledWith(99, 'test-user');
  });
});
