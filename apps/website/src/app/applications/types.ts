import type { JobEvaluationDecision } from '@apps/shared';

export interface JobApplication {
  id: number;
  job: Job;
  coverLetter?: string;
  evaluationResult?: JobEvaluationDecision | null;
  createdAt: string;
  status?: 'processing' | 'applied' | 'not-applied' | 'dismissed';
}

export interface Job {
  id: number;
  title: string;
  description: string;
  company: string;
  url: string;
  source: 'linkedin' | 'startupjobs';
  createdAt: string;
}
