import { NextResponse } from 'next/server';
import { getJobApplication } from '@/app/lib/db/db-client';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = await getJobApplication(id);

  if (!application) {
    return NextResponse.json(
      { message: 'Application not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(application);
}
