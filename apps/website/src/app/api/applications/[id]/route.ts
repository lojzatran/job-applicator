import { NextResponse } from 'next/server';
import { getJobApplication } from '@/app/lib/db/db-client';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return NextResponse.json(
      { message: 'Invalid id parameter' },
      { status: 400 },
    );
  }

  const application = await getJobApplication(numericId);

  if (!application) {
    return NextResponse.json(
      { message: 'Application not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(application);
}
