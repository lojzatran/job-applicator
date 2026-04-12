'use client';

import { useEffect, useState } from 'react';

/**
 * A visually appealing processing state for the job applicator.
 * It simulates progress by cycling through different status messages.
 */
export const ProcessingState = () => {
  const [step, setStep] = useState(0);

  const statuses = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      text: 'Parsing your resume...',
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      text: 'Searching for relevant jobs...',
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5 animate-spin"
        >
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
      ),
      text: 'Matching your skills...',
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      text: 'Drafting cover letters...',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % statuses.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />

        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-100 bg-white/80 shadow-xl backdrop-blur-md dark:border-emerald-900/50 dark:bg-slate-900/80">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Applying AI Magic
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          We're analyzing matches and preparing everything for you.
        </p>
      </div>

      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col gap-1">
          {statuses.map((status, index) => (
            <div
              key={status.text}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                index === step
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-400 opacity-40'
              }`}
            >
              <div className={index === step ? 'animate-bounce' : ''}>
                {status.icon}
              </div>
              <span className="text-sm font-semibold">{status.text}</span>
              {index === step && (
                <div className="ml-auto flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 animate-pulse">
        This may take a minute
      </p>
    </div>
  );
};
