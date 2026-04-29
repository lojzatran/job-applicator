import { getInProgressJobApplicationProcessingRunForUser } from '@/app/lib/db/db-client';
import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth/with-auth';

export const GET = withAuth(async (_request, { user }) => {
  const jobApplicationProcessingRun =
    await getInProgressJobApplicationProcessingRunForUser(user.id);

  return NextResponse.json(jobApplicationProcessingRun);
}, 'runs/current');
