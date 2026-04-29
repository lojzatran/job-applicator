import { listJobApplications } from '@/app/lib/db/db-client';
import { NextResponse } from 'next/server';
import { withAuth } from '../../lib/auth/with-auth';

export const GET = withAuth(async (_request, ctx) => {
  const applications = await listJobApplications(ctx.user.id);

  return NextResponse.json(applications);
}, 'applications');
