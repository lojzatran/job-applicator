import { getJobApplicationProcessingRunByThreadIdAndUserId } from '@/app/lib/db/db-client';
import { withAuth } from '@/app/lib/auth/with-auth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, ctx) => {
  const params = ctx.params ? await ctx.params : {};
  const jobApplicationProcessingRun =
    await getJobApplicationProcessingRunByThreadIdAndUserId(
      params.id as string,
      ctx.user.id,
    );

  if (!jobApplicationProcessingRun) {
    return NextResponse.json(
      { message: 'Job application processing run not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(jobApplicationProcessingRun);
}, 'runs/[id]');
