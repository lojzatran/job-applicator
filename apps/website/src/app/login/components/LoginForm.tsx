'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { getPublicAppUrl } from '@/app/lib/public-url';
import { getSafeNextPath } from '@/app/lib/redirect';

type FormMode = 'sign-in' | 'sign-up';

interface LoginFormProps {
  nextPath: string;
}

export const LoginForm = ({ nextPath }: LoginFormProps) => {
  const router = useRouter();
  const safeNextPath = getSafeNextPath(nextPath);
  const [mode, setMode] = useState<FormMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);

  const getCallbackUrl = () => {
    const appUrl = getPublicAppUrl(window.location.origin);

    return `${appUrl}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    const supabase = createClient();

    const trimmedEmail = email.trim();

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              emailRedirectTo: getCallbackUrl(),
            },
          });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    if (mode === 'sign-up') {
      setMessage(
        'Account created. Check your email for confirmation if your project requires it.',
      );
    } else {
      router.refresh();
      router.push(safeNextPath);
    }

    setIsSubmitting(false);
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setMessage('');
    setIsOAuthSubmitting(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (authError) {
      setError(authError.message);
      setIsOAuthSubmitting(false);
      return;
    }

    if (!data.url) {
      setError('Facebook sign-in did not return an authorization URL.');
      setIsOAuthSubmitting(false);
      return;
    }

    window.location.assign(data.url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/60">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === 'sign-in'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            mode === 'sign-up'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Create account
        </button>
      </div>

      <button
        type="button"
        onClick={handleFacebookSignIn}
        disabled={isSubmitting || isOAuthSubmitting}
        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[0.7rem] font-black text-white">
          f
        </span>
        {isOAuthSubmitting ? 'Connecting...' : 'Continue with Facebook'}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          or email
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          placeholder="you@company.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete={
            mode === 'sign-in' ? 'current-password' : 'new-password'
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          placeholder="••••••••"
          minLength={6}
          required
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        {isSubmitting
          ? 'Working...'
          : mode === 'sign-in'
            ? 'Sign in'
            : 'Create account'}
      </button>
    </form>
  );
};
