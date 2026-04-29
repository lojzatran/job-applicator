import { getInProgressJobApplicationProcessingRunForUser } from '@/app/lib/db/db-client';
import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth/with-auth';

export const GET = withAuth(async (_request, ctx) => {
  const jobApplicationProcessingRun =
    await getInProgressJobApplicationProcessingRunForUser(ctx.user.id);

  return NextResponse.json(jobApplicationProcessingRun);
}, 'runs/current');
