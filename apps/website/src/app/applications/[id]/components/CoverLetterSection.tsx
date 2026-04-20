'use client';

interface CoverLetterSectionProps {
  coverLetter?: string;
}

export const CoverLetterSection = ({
  coverLetter,
}: CoverLetterSectionProps) => {
  const handleCopy = () => {
    if (coverLetter) {
      navigator.clipboard.writeText(coverLetter);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900/60 transition-all overflow-hidden">
      <div className="border-b border-slate-100 p-6 dark:border-slate-800/50 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-emerald-500"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Generated Cover Letter
        </h2>
        <button
          onClick={handleCopy}
          disabled={!coverLetter}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all border ${
            coverLetter
              ? 'bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/40 border-slate-200 dark:border-slate-700'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed'
          }`}
          title={
            coverLetter ? 'Copy to clipboard' : 'Cover letter not generated yet'
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-slate-500 group-hover:text-emerald-600"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        </button>
      </div>
      <div className="p-10 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-inner dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-serif italic text-lg tracking-tight">
              {coverLetter ||
                'Your tailored cover letter is being generated. Please check back in a moment...'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
