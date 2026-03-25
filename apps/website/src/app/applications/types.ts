export interface JobApplication {
  id: string;
  url: string;
  source: string;
  job: {
    id: string;
    title: string;
    description: string;
    company: string;
    url: string;
    source: 'linkedin' | 'startupjobs';
  };
  coverLetter?: string;
  createdAt: string;
}
