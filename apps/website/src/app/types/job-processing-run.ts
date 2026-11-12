export type JobProcessingRunStatus =
  | 'pending'
  | 'in progress'
  | 'completed'
  | 'failed';

export interface JobApplicationProcessingRun {
  id: number;
  threadId: string;
  status: JobProcessingRunStatus;
  lastUpdatedAt: string;
  totalJobs: number;
  evaluatedJobApplications: number;
  dismissedJobApplications: number;
  appliedJobApplications: number;
}
