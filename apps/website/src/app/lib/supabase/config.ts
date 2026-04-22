import { env } from '../../utils/env';

export function getSupabaseUrl() {
  const value = env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set',
    );
  }

  return value;
}
