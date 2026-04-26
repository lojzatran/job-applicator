'use client';

import { Job, JobApplication } from '../types';
import { ApplicationRow } from './ApplicationRow';

interface ApplicationsTableProps {
  applications: JobApplication[];
  jobs: Job[];
}

const splitIntoTwoGroupsBy = <T,>(
  arr: T[],
  fn: (item: T, index: number) => boolean,
): [T[], T[]] =>
  arr.reduce(
    (acc, val, i) => {
      acc[fn(val, i) ? 0 : 1].push(val);
      return acc;
    },
    [[], []] as [T[], T[]],
  );

export const ApplicationsTable = ({
  applications,
  jobs,
}: ApplicationsTableProps) => {
  const [appliedJobs, unappliedJobs] = splitIntoTwoGroupsBy(
    applications,
    (app: JobApplication) => {
      return app.status === 'applied';
    },
  );

  const jobsWithNoApplication = jobs.filter(
    (job) => !applications.find((app) => app.job.id === job.id),
  );

  const finalJobApplicationArray = [...appliedJobs, ...unappliedJobs];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-950/20">
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Job Title
            </th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Company
            </th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Applied On
            </th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Status
            </th>
            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
              Job link
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {finalJobApplicationArray.map((app) => {
            const job = jobs.find((job) => job.id === app.job.id);
            return <ApplicationRow key={app.id} application={app} job={job!} />;
          })}
          {jobsWithNoApplication.map((job) => (
            <ApplicationRow key={job.id} application={undefined} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
