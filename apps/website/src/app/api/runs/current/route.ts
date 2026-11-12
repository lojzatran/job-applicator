import { getInProgressJobApplicationProcessingRunForUser } from '@/app/lib/db/processing-run.repository';
import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth/with-auth';
import { JobApplicationProcessingRun } from '@apps/shared';

export const GET = withAuth<JobApplicationProcessingRun | null>(async (_request, ctx) => {
  const jobApplicationProcessingRun =
    await getInProgressJobApplicationProcessingRunForUser(ctx.user.id);

  return NextResponse.json(jobApplicationProcessingRun);
}, 'runs/current');
