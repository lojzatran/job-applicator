import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSafeNextPath } from './app/lib/redirect';
import { getSupabaseAnonKey, getSupabaseUrl } from './app/lib/supabase/config';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    if (isApiPath(request.nextUrl.pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      getSafeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );

    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === '/login') {
    const nextPath = getSafeNextPath(
      request.nextUrl.searchParams.get('next') ?? undefined,
    );
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|startupjobs-32x32.png).*)',
  ],
};
