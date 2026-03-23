export type UploadResponse = {
  message: string;
  linkedinEnabled: boolean;
  startupJobsEnabled: boolean;
  maxJobs: number;
  file: {
    originalName: string;
    storedName: string;
    path: string;
    mimeType: string;
    size: number;
  };
};
