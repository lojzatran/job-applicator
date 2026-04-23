import { NextResponse } from 'next/server';
import { createLogger } from '@apps/shared/pinoLogger';
import { createClient } from '@/app/lib/supabase/server';
import { getSafeNextPath } from '@/app/lib/redirect';

const logger = createLogger('auth-callback');
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextPath = getSafeNextPath(searchParams.get('next') ?? undefined);

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(nextPath, origin));
      }

      logger.warn({ error }, 'Failed to exchange OAuth code for session');
    }
  } catch (error) {
    logger.error({ err: error }, 'OAuth callback failed');
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin));
}
