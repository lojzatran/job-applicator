import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/server';
import { getSafeNextPath } from '@/app/lib/redirect';
import { LoginForm } from './components/LoginForm';

interface LoginPageProps {
  searchParams?: {
    next?: string;
    error?: string;
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = getSafeNextPath(searchParams?.next);

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-100 text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(148,163,184,0.08),_transparent_35%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="max-w-2xl">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
            >
              Job Applicator AI
            </Link>

            <h1 className="max-w-xl bg-gradient-to-r from-emerald-700 via-teal-500 to-cyan-500 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl lg:text-7xl dark:from-emerald-300 dark:via-cyan-300 dark:to-sky-300">
              Sign in to manage your job search workspace.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Keep your processed applications, resume uploads, and AI-driven
              job matching in one protected place.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                'Secure Supabase sessions',
                'Protected application history',
                'Fast access to the AI pipeline',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white/70 p-4 text-sm font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-stone-300/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">
                Authentication
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use your Supabase account to continue.
              </p>
            </div>

            <LoginForm nextPath={nextPath} />

            {searchParams?.error ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Authentication failed. Please try again.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
