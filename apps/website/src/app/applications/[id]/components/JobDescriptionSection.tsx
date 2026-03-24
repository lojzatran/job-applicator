'use client';

interface JobDescriptionSectionProps {
  description: string;
}

export const JobDescriptionSection = ({ description }: JobDescriptionSectionProps) => {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900/60 transition-all overflow-hidden">
      <div className="border-b border-slate-100 p-6 dark:border-slate-800/50">
        <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-emerald-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Job Description
        </h2>
      </div>
      <div className="p-8">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div 
            className="leading-relaxed text-slate-600 dark:text-slate-400"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      </div>
    </section>
  );
};
