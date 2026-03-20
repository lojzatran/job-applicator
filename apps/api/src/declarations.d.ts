declare module 'linkedin-jobs-api' {
  export interface LinkedInQueryObject {
    host?: string;
    keyword?: string;
    location?: string;
    dateSincePosted?: 'past month' | 'past week' | '24hr' | string;
    jobType?: 'full time' | 'part time' | 'contract' | 'temporary' | 'volunteer' | 'internship' | string;
    remoteFilter?: 'on-site' | 'remote' | 'hybrid' | string;
    salary?: '40000' | '60000' | '80000' | '100000' | '120000' | string;
    experienceLevel?: 'internship' | 'entry level' | 'associate' | 'senior' | 'director' | 'executive' | string;
    sortBy?: 'recent' | 'relevant' | string;
    limit?: number | string;
    page?: number | string;
    has_verification?: boolean;
    under_10_applicants?: boolean;
  }

  export interface LinkedInJob {
    position: string;
    company: string;
    location: string;
    date: string;
    salary: string;
    jobUrl: string;
    companyLogo: string;
    agoTime: string;
  }

  export function query(queryObject: LinkedInQueryObject): Promise<LinkedInJob[]>;
  export function clearCache(): void;
  export function getCacheSize(): number;

  export class JobCache {
    constructor();
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    clear(): void;
  }

  const linkedIn: {
    query: typeof query;
    clearCache: typeof clearCache;
    getCacheSize: typeof getCacheSize;
    JobCache: typeof JobCache;
  };

  export default linkedIn;
}
