import { createClient as createSupabaseClient } from '../supabase/server';
import { createLogger } from '@apps/shared/pinoLogger';
import { NextRequest, NextResponse } from 'next/server';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseEntity } from '@apps/shared';

const logger = createLogger('auth-wrapper');

export interface AuthenticatedHandler<
  RouteParams extends Record<string, string> = Record<string, string>,
> {
  (
    request: NextRequest,
    ctx: {
      params: Promise<RouteParams>;
      user: User;
      supabase: SupabaseClient;
    },
  ): Promise<
    | NextResponse<{
        message: string;
      }>
    | NextResponse<DatabaseEntity | null>
    | NextResponse<DatabaseEntity[]>
  >;
}

/**
 * Higher-order function to wrap API route handlers with authentication logic.
 *
 * @param handler - The actual route handler function
 * @param routeName - Name of the route for logging purposes
 * @returns A wrapped handler that checks for a valid user session
 */
export function withAuth<
  RouteParams extends Record<string, string> = Record<string, string>,
>(handler: AuthenticatedHandler<RouteParams>, routeName: string) {
  return async (
    request: NextRequest,
    ctx: { params: Promise<RouteParams> },
  ): ReturnType<AuthenticatedHandler<RouteParams>> => {
    const params = await ctx.params;
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

    return handler(request, {
      params: Promise.resolve(params),
      user,
      supabase,
    });
  };
}
