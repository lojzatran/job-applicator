'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { JobApplication } from '../types';

interface ApplicationRowProps {
  application: JobApplication;
}

export const ApplicationRow = ({ application: app }: ApplicationRowProps) => {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/applications/${app.id}`)}
      className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 cursor-pointer"
    >
      <td className="px-6 py-6 font-semibold text-slate-800 dark:text-slate-200">
        <Link
          href={`/applications/${app.id}`}
          className="hover:text-emerald-600 dark:hover:text-emerald-400"
          onClick={(e) => e.stopPropagation()}
        >
          {app.job.title}
        </Link>
      </td>
      <td className="px-6 py-6 font-medium text-slate-600 dark:text-slate-400">
        <div className="flex flex-col gap-2 min-w-max">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 w-fit">
            {app.job.company}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${app.source === 'linkedin' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}
          >
            {app.source}
          </span>
        </div>
      </td>
      <td className="px-6 py-6 text-sm text-slate-500 dark:text-slate-500">
        {new Date(app.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>
      <td className="px-6 py-6 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-500 dark:text-slate-500 italic">
        {app.coverLetter
          ? `"${app.coverLetter.substring(0, 60)}..."`
          : '(Processing cover letter...)'}
      </td>
      <td className="px-6 py-6 text-right">
        <a
          href={app.job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm"
          title="View Job"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </td>
    </tr>
  );
};
