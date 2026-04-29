import { createClient as createSupabaseClient } from '../supabase/server';
import { createLogger } from '@apps/shared/pinoLogger';
import { NextRequest, NextResponse } from 'next/server';
import { User, SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('auth-wrapper');

export type AuthenticatedHandler = (
  request: NextRequest,
  context: { user: User; supabase: SupabaseClient },
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap API route handlers with authentication logic.
 *
 * @param handler - The actual route handler function
 * @param routeName - Name of the route for logging purposes
 * @returns A wrapped handler that checks for a valid user session
 */
export function withAuth(handler: AuthenticatedHandler, routeName: string) {
  return async (request: NextRequest) => {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error(
        `Unauthorized user in ${routeName} handler. This should not happen as this route should be protected by middleware`,
      );
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, { user, supabase });
  };
}
