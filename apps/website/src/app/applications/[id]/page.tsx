'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { BackgroundDecor } from '../../components/BackgroundDecor';
import { JobProcessingRunBadge } from '../../components/JobProcessingRunBadge';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useThemePreference } from '../../hooks/useThemePreference';
import { JobApplication } from '../types';
import { LoadingState } from '../components/LoadingState';
import { ApplicationDetailHeader } from './components/ApplicationDetailHeader';
import { JobDescriptionSection } from './components/JobDescriptionSection';
import { CoverLetterSection } from './components/CoverLetterSection';

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isDarkMode, toggleDarkMode } = useThemePreference();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApplication() {
      try {
        const response = await fetch(`/api/applications/${id}`);
        if (response.ok) {
          const data = await response.json();
          setApplication(data);
        }
      } catch (error) {
        console.error(
          '[application-detail-page] Failed to fetch application details',
          error,
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchApplication();
  }, [id]);

  if (isLoading) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
          <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3 sm:right-8 sm:top-8">
            <JobProcessingRunBadge />
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
          </div>

          <div className="flex min-h-screen items-center justify-center">
            <LoadingState />
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
          <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3 sm:right-8 sm:top-8">
            <JobProcessingRunBadge />
            <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
          </div>

          <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <h1 className="mb-4 text-2xl font-bold">Application not found</h1>
            <Link
              href="/applications"
              className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Return to applications list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
        <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3 sm:right-8 sm:top-8">
          <JobProcessingRunBadge />
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
        </div>

        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 font-sans sm:px-6">
          <ApplicationDetailHeader application={application} />

          <div className="grid gap-8 lg:grid-cols-1 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <JobDescriptionSection description={application.job.description} />
            <CoverLetterSection coverLetter={application.coverLetter} />
          </div>
        </main>

        <BackgroundDecor />
      </div>
    </div>
  );
}
