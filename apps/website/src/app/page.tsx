'use client';

import { useState, useEffect } from 'react';

export default function Index() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);

  // Sync dark mode with system preference initially or use local storage
  useEffect(() => {
    const savedMode = localStorage.getItem('theme');
    if (savedMode === 'dark') {
      setIsDarkMode(true);
    } else if (savedMode === 'light') {
      setIsDarkMode(false);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 flex flex-col items-center justify-center font-sans selection:bg-indigo-500 selection:text-white">
        
        {/* Dark Mode Toggle - Top Right */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
          <button
            onClick={toggleDarkMode}
            className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all duration-300"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Main Content Card */}
        <main className="w-full max-w-md px-4 sm:px-6 py-12 sm:py-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <header className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 rounded-3xl bg-indigo-600 mb-4 sm:mb-6 shadow-2xl shadow-indigo-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6 sm:w-8 sm:h-8">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">
              Job Applicator
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium tracking-widest uppercase">
              Accelerate your career journey
            </p>
          </header>

          <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8 sm:space-y-10">
              {/* Linkedin Toggle */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" fill="#0077b5" className="w-5 h-5 sm:w-6 sm:h-6">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </div>
                  <div>
                    <label htmlFor="linkedin-toggle" className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 cursor-pointer">
                      LinkedIn
                    </label>
                    <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">Auto-sync profile</p>
                  </div>
                </div>
                
                <button
                  id="linkedin-toggle"
                  type="button"
                  onClick={() => setLinkedinEnabled(!linkedinEnabled)}
                  className={`relative inline-flex h-6 w-11 sm:h-7 sm:w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    linkedinEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                      linkedinEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Go Button */}
              <button
                type="submit"
                className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-3 overflow-hidden group"
              >
                <span className="relative z-10 text-sm sm:text-base">Go</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </section>

          <footer className="mt-8 sm:mt-12 text-center pb-8 sm:pb-0">
            <p className="text-slate-400 dark:text-slate-600 text-sm font-medium">
              &copy; 2024 Job Applicator AI. All rights reserved.
            </p>
          </footer>
        </main>

        {/* Decorative background elements */}
        <div className="fixed top-0 left-0 -z-10 w-full h-full overflow-hidden pointer-events-none opacity-50 dark:opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
  );
}
