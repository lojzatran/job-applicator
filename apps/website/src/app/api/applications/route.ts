import { NextResponse } from 'next/server';
import { listJobApplications } from '@/app/lib/db/db-client';

export const runtime = 'nodejs';

export async function GET() {
  const applications = await listJobApplications();

  return NextResponse.json(applications);
}
