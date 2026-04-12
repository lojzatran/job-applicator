export interface JobApplicationProcessingRun {
  id: number;
  threadId: string;
  status: string;
  totalJobs: number;
  evaluatedJobApplications: number;
  dismissedJobApplications: number;
  appliedJobApplications: number;
}
