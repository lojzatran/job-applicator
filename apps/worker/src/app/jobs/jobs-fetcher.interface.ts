import { Job } from '@apps/shared';

export interface JobsFetcher {
  fetchJobs(): Promise<Omit<Job, 'id'>[]>;
  getSourceName(): string;
}
