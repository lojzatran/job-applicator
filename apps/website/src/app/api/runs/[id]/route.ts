import { getJobApplicationProcessingRunByThreadIdAndUserId } from '@/app/lib/db/db-client';
import { withAuth } from '@/app/lib/auth/with-auth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params, user }) => {
  const { id } = await params;
  const jobApplicationProcessingRun =
    await getJobApplicationProcessingRunByThreadIdAndUserId(id, user.id);

  if (!jobApplicationProcessingRun) {
    return NextResponse.json(
      { message: 'Job application processing run not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(jobApplicationProcessingRun);
}, 'runs/[id]');
