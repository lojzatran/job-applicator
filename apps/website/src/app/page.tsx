'use client';

import { BackgroundDecor } from './components/BackgroundDecor';
import { LinkedInToggle } from './components/LinkedInToggle';
import { PageHero } from './components/PageHero';
import { ResumeDropzone } from './components/ResumeDropzone';
import { StatusMessage } from './components/StatusMessage';
import { SubmitButton } from './components/SubmitButton';
import { ThemeToggle } from './components/ThemeToggle';
import { useResumeUpload } from './hooks/useResumeUpload';
import { useThemePreference } from './hooks/useThemePreference';

export default function Index() {
  const { isDarkMode, toggleDarkMode } = useThemePreference();
  const {
    linkedinEnabled,
    setLinkedinEnabled,
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

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-100 text-slate-900 transition-colors duration-500 selection:bg-emerald-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />

        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-12 font-sans sm:px-6 sm:py-10">
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <PageHero />

            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-stone-300/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none sm:rounded-[2.5rem] sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-9">
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

                <SubmitButton isUploading={isUploading} />
              </form>
            </section>

            <footer className="mt-8 pb-8 text-center sm:mt-12 sm:pb-0">
              <p className="text-sm font-medium text-slate-400 dark:text-slate-600">
                &copy; 2024 Job Applicator AI. All rights reserved.
              </p>
            </footer>
          </div>
        </main>

        <BackgroundDecor />
      </div>
    </div>
  );
}
