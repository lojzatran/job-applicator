export type JobProcessingRunStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface JobApplicationProcessingRun {
  id: number;
  threadId: string;
  status: JobProcessingRunStatus;
  totalJobs: number;
  evaluatedJobApplications: number;
  dismissedJobApplications: number;
  appliedJobApplications: number;
}
