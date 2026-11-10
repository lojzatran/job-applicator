import type { Cv } from '@apps/shared';
import { stripHtml } from 'string-strip-html';
import type { Job } from '../../../jobs/types';

type CandidateSection = string | string[] | null;

export interface JobFitState extends Record<string, unknown> {
  candidate: Record<string, CandidateSection>;
  job: {
    title: string;
    company: string;
    description: string;
  };
}

export function buildJobFitState(cv: Cv, job: Job): JobFitState {
  return {
    candidate: buildCandidate(cv),
    job: {
      title: job.title,
      company: job.company,
      description: stripHtml(job.description).result,
    },
  };
}

/** Sends only non-empty parsed sections; falls back to the raw CV text when parsing found nothing. */
function buildCandidate(cv: Cv): Record<string, CandidateSection> {
  const sections: Record<string, CandidateSection> = {
    summary: cv.summary,
    skills: cv.skills,
    experience: cv.experience,
    projects: cv.projects,
    education: cv.education,
    other: cv.other,
  };
  const filled = Object.fromEntries(
    Object.entries(sections).filter(([, value]) => hasContent(value)),
  );

  return Object.keys(filled).length > 0 ? filled : { cv_text: cv.rawText };
}

function hasContent(value: CandidateSection): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim().length > 0);
  }
  return !!value && value.trim().length > 0;
}
