'use client';

import { useEffect, useState } from 'react';
import { BackgroundDecor } from '../components/BackgroundDecor';
import { AuthMenu } from '../components/AuthMenu';
import { JobProcessingRunBadge } from '../components/JobProcessingRunBadge';
import { ThemeToggle } from '../components/ThemeToggle';
import { useThemePreference } from '../hooks/useThemePreference';
import { Job, JobApplication } from './types';
import { ApplicationsHeader } from './components/ApplicationsHeader';
import { ApplicationsTable } from './components/ApplicationsTable';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';

export default function ApplicationsPage() {
  const { isDarkMode, toggleDarkMode } = useThemePreference();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const response = await fetch(`/api/applications`);
        if (response.ok) {
          const data = await response.json();
          setApplications(data);
        }
      } catch (error) {
        console.error(
          '[applications-page] Failed to fetch applications',
          error,
        );
      }
    }

    async function fetchJobs() {
      try {
        const response = await fetch(`/api/jobs`);
        if (response.ok) {
          const data = await response.json();
          setJobs(data);
        }
      } catch (error) {
        console.error('[applications-page] Failed to fetch jobs', error);
      }
    }

    Promise.all([fetchApplications(), fetchJobs()]).finally(() => {
      setIsLoading(false);
    });

    const interval = setInterval(() => {
      fetchApplications();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
        <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3 sm:right-8 sm:top-8">
          <AuthMenu />
          <JobProcessingRunBadge />
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
        </div>

        <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-12 font-sans sm:px-6">
          <ApplicationsHeader
            appliedCount={applications.length}
            totalCount={jobs.length}
          />

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-2xl shadow-stone-300/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
            {isLoading ? (
              <LoadingState />
            ) : jobs.length > 0 ? (
              <ApplicationsTable applications={applications} jobs={jobs} />
            ) : (
              <EmptyState />
            )}
          </div>
        </main>

        <BackgroundDecor />
      </div>
    </div>
  );
}
