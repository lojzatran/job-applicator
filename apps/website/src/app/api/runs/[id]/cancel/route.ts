import { NextResponse } from 'next/server';
import type { JobApplicationProcessingRun } from '@apps/shared';
import { withAuth } from '@/app/lib/auth/with-auth';
import { cancelStaleJobApplicationProcessingRun } from '@/app/lib/db/processing-run.repository';

export const POST = withAuth<JobApplicationProcessingRun>(
  async (_request, ctx) => {
    const { id } = await ctx.params;
    const processingRun = await cancelStaleJobApplicationProcessingRun(
      id,
      ctx.user.id,
    );

    if (!processingRun) {
      return NextResponse.json(
        {
          message:
            'This run cannot be cancelled. It may have been updated recently.',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(processingRun);
  },
  'runs/[id]/cancel',
);
