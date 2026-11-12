import { createClient as createSupabaseClient } from '../supabase/server';
import { createLogger } from '@apps/shared/pinoLogger';
import { NextRequest, NextResponse } from 'next/server';
import { User, SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('auth-wrapper');

export interface AuthenticatedHandler<
  RouteParams extends Record<string, string> = Record<string, string>,
  ResponseBody = unknown,
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
    | NextResponse<ResponseBody>
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
  ResponseBody = unknown,
  RouteParams extends Record<string, string> = Record<string, string>,
>(handler: AuthenticatedHandler<RouteParams, ResponseBody>, routeName: string) {
  return async (
    request: NextRequest,
    ctx: { params: Promise<RouteParams> },
  ): ReturnType<AuthenticatedHandler<RouteParams, ResponseBody>> => {
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
