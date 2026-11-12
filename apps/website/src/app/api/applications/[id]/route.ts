import { NextResponse } from 'next/server';
import { getJobApplication } from '@/app/lib/db/db-client';
import { withAuth } from '@/app/lib/auth/with-auth';

export const runtime = 'nodejs';

export const GET = withAuth(
  async (
    _request,
    { params, user },
  )=> {
    const { id } = await params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { message: 'Invalid id parameter' },
        { status: 400 },
      );
    }

    const application = await getJobApplication(numericId, user.id);

    if (!application) {
      return NextResponse.json(
        { message: 'Application not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(application);
  },
  'applications/[id]',
);
