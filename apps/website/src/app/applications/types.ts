export interface JobApplication {
  id: number;
  job: Job;
  coverLetter?: string;
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
