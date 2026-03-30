import { z } from 'zod/v4';

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  company: z.string(),
  url: z.string(),
  source: z.enum(['linkedin', 'startupjobs']),
});

export type Job = z.infer<typeof JobSchema>;
