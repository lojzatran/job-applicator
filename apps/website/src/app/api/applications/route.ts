import { listJobApplications } from '@/app/lib/db/db-client';
import { NextResponse } from 'next/server';
import { withAuth } from '../../lib/auth/with-auth';

export const GET = withAuth(async (_request, { user }) => {
  const applications = await listJobApplications(user.id);

  return NextResponse.json(applications);
}, 'applications');
