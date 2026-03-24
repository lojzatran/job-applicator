'use client';

import { JobApplication } from '../types';
import { ApplicationRow } from './ApplicationRow';

interface ApplicationsTableProps {
  applications: JobApplication[];
}

export const ApplicationsTable = ({ applications }: ApplicationsTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-950/20">
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Job Title</th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Company</th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Applied On</th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cover Letter Sneak Peek</th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {applications.map((app) => (
            <ApplicationRow key={app.id} application={app} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
