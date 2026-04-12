'use client';

import Link from 'next/link';
import { BackgroundDecor } from './components/BackgroundDecor';
import { LinkedInToggle } from './components/LinkedInToggle';
import { JobProcessingRunBadge } from './components/JobProcessingRunBadge';
import { PageHero } from './components/PageHero';
import { ResumeDropzone } from './components/ResumeDropzone';
import { MaxJobsField } from './components/MaxJobsField';
import { StatusMessage } from './components/StatusMessage';
import { SubmitButton } from './components/SubmitButton';
import { StartupJobsToggle } from './components/StartupJobsToggle';
import { ThemeToggle } from './components/ThemeToggle';
import { useResumeUpload } from './hooks/useResumeUpload';
import { ProcessingState } from './components/ProcessingState';
import { useThemePreference } from './hooks/useThemePreference';
import { useJobProcessingRun } from './hooks/useJobProcessingRun';

export default function Index() {
  const { isDarkMode, toggleDarkMode } = useThemePreference();
  const {
    linkedinEnabled,
    setLinkedinEnabled,
    startupJobsEnabled,
    setStartupJobsEnabled,
    maxJobs,
    setMaxJobs,
    selectedFile,
    isDragging,
    isUploading,
    validationMessage,
    readyMessage,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleSubmit,
    openFilePicker,
  } = useResumeUpload();
  const { jobProcessingRun } = useJobProcessingRun();
  const isActive = jobProcessingRun?.status === 'active';

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
        <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-3 sm:right-8 sm:top-8">
          <JobProcessingRunBadge />
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
        </div>

        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-12 font-sans sm:px-6 sm:py-10">
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <PageHero />

            {isActive ? (
              <ProcessingState />
            ) : (
              <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-stone-300/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none sm:rounded-[2.5rem] sm:p-8">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8 sm:space-y-9"
                >
                  <ResumeDropzone
                    fileInputRef={fileInputRef}
                    selectedFile={selectedFile}
                    isDragging={isDragging}
                    onFileChange={handleFileChange}
                    onDrop={handleDrop}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onOpenFilePicker={openFilePicker}
                  />

                  <StatusMessage tone="error" message={validationMessage} />
                  <StatusMessage tone="success" message={readyMessage} />

                  <LinkedInToggle
                    enabled={linkedinEnabled}
                    onToggle={() => setLinkedinEnabled(!linkedinEnabled)}
                  />

                  <StartupJobsToggle
                    enabled={startupJobsEnabled}
                    onToggle={() => setStartupJobsEnabled(!startupJobsEnabled)}
                  />

                  <MaxJobsField value={maxJobs} onChange={setMaxJobs} />

                  <SubmitButton isUploading={isUploading} />
                </form>
              </section>
            )}

            <div className="mt-8 flex justify-center">
              <Link
                href="/applications"
                className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/50 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-emerald-900/50 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400"
              >
                <span>View My Applications</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <footer className="mt-12 pb-8 text-center sm:pb-0">
              <p className="text-sm font-medium text-slate-400 dark:text-slate-600">
                &copy; 2026 Job Applicator AI. All rights reserved.
              </p>
            </footer>
          </div>
        </main>

        <BackgroundDecor />
      </div>
    </div>
  );
}
