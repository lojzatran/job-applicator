import { z } from 'zod';

const StringArray = z.array(z.string().trim().min(1)).default([]);

const CvSchema = z.object({
  summary: z.string().optional(),

  skills: StringArray,

  experience: z
    .array(
      z
        .string()
        .describe('Should be `<companyName> - <jobTitle>: <jobDescription>`'),
    )
    .default([]),

  projects: z
    .array(
      z.string().describe('Should be `<projectName>: <projectDescription>`'),
    )
    .default([]),

  education: z
    .array(
      z
        .string()
        .describe('Should be `<school> - <degree> - <description optional>`'),
    )
    .default([]),

  other: z
    .array(z.string())
    .optional()
    .describe('Any other texts in CV that did not fit the rest of the schema'),
});

export { CvSchema };
