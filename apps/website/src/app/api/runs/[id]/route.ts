import { getJobApplicationProcessingRun } from '@/app/lib/db/db-client';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const jobApplicationProcessingRun = await getJobApplicationProcessingRun(id);

  if (!jobApplicationProcessingRun) {
    return NextResponse.json(
      { message: 'Job application processing run not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(jobApplicationProcessingRun);
}
