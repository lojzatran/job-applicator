import { z } from 'zod';

const StringArray = z.array(z.string().trim().min(1));

const CvSchema = z.object({
  summary: z
    .string()
    .optional()
    .describe(
      'A short professional summary or about me section. Do NOT include the entire CV text here, only the specific summary part if available.',
    ),

  skills: StringArray.describe(
    'REQUIRED: List of technical and soft skills, technologies, and tools.',
  ),

  experience: z
    .array(
      z
        .string()
        .describe('Should be `<companyName> - <jobTitle>: <jobDescription>`'),
    )
    .describe('REQUIRED: Work history and professional experience.'),

  projects: z
    .array(
      z.string().describe('Should be `<projectName>: <projectDescription>`'),
    )
    .describe('REQUIRED: Specific projects and accomplishments.'),

  education: z
    .array(
      z
        .string()
        .describe('Should be `<school> - <degree> - <description optional>`'),
    )
    .describe('REQUIRED: Educational history and degrees.'),

  other: z
    .array(z.string())
    .optional()
    .describe('Any other texts in CV that did not fit the rest of the schema'),
});

export { CvSchema };
