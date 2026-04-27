import { NextResponse } from 'next/server';
import { listJobs } from '@/app/lib/db/db-client';

export const runtime = 'nodejs';

export async function GET() {
  const applications = await listJobs();

  return NextResponse.json(applications);
}
