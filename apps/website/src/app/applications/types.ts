export interface JobApplication {
  id: string;
  job: {
    id: string;
    title: string;
    description: string;
    company: string;
    url: string;
  };
  coverLetter: string;
  createdAt: string;
}
