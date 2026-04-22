'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserSummary {
  email?: string | null;
}

export const AuthMenu = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, currentSession: Session | null) => {
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-col text-right">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
          Account
        </span>
        <span className="max-w-[11rem] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {isLoading ? 'Loading...' : (user?.email ?? 'Signed in')}
        </span>
      </div>

      <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        Sign out
      </button>
    </div>
  );
};
