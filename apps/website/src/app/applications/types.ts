export interface JobApplication {
  id: string;
  url: string;
  source: string;
  job: Job;
  coverLetter?: string;
  createdAt: string;
  status: 'applied' | 'dismissed' | 'processing';
}

export interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  url: string;
  source: 'linkedin' | 'startupjobs';
  createdAt: string;
}
