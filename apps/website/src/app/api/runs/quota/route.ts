import { NextResponse } from 'next/server';
import { withAuth } from '@/app/lib/auth/with-auth';
import { getProcessingRunQuota } from '@/app/lib/services/processing-run.service';
import { ProcessingRunQuota } from '@/app/types/processing-run-quota';

export const runtime = 'nodejs';

export const GET = withAuth<ProcessingRunQuota>(async (_request, ctx) => {
  const quota = await getProcessingRunQuota(ctx.user.id);
  return NextResponse.json(quota, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}, 'runs/quota');
