export type JobProcessingRunStatus =
  | 'pending'
  | 'in progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface JobApplicationProcessingRun {
  id: number;
  threadId: string;
  status: JobProcessingRunStatus;
  lastUpdatedAt: string;
  totalJobs: number;
  evaluatedJobApplications: number;
  dismissedJobApplications: number;
  uncertainJobApplications: number;
  appliedJobApplications: number;
}
