import type { Answer, Answers } from '@langchain/openai';
import type { JobFitQuestions } from './job-fit.questions';

export const BLOCKERS = [
  'spoken_language_missing',
  'domain_experience_missing',
  'formal_qualification_missing',
] as const;

export type Blocker = (typeof BLOCKERS)[number];

export interface ScoreValue {
  /** Probability-weighted average of the zero-based level indices. */
  score: number;
  /** Probability of each level, indexed by level. */
  levels: number[];
}

/** Jev answers normalized for the decision table. `null` means the model refused. */
export interface JobFitAnswers {
  roleMatch: ScoreValue;
  coreRequirements: ScoreValue;
  niceToHaveListed: number | null;
  niceToHaveCoverage: ScoreValue | null;
  seniorityStated: number | null;
  jobExpectsMoreSeniority: number | null;
  blockers: Record<Blocker, number | null>;
}

export function toJobFitAnswers(
  answers: Answers<JobFitQuestions>,
): JobFitAnswers {
  return {
    roleMatch: requireScore(answers.role_match, 'role_match'),
    coreRequirements: requireScore(
      answers.core_requirements,
      'core_requirements',
    ),
    niceToHaveListed: toProbability(answers.nice_to_have_listed),
    niceToHaveCoverage: toScore(answers.nice_to_have_coverage),
    seniorityStated: toProbability(answers.seniority_stated),
    jobExpectsMoreSeniority: toChoiceProbability(
      answers.seniority,
      'job_expects_more_seniority',
    ),
    blockers: {
      spoken_language_missing: toProbability(answers.spoken_language_missing),
      domain_experience_missing: toProbability(
        answers.domain_experience_missing,
      ),
      formal_qualification_missing: toProbability(
        answers.formal_qualification_missing,
      ),
    },
  };
}

function toProbability(answer: Answer): number | null {
  return answer.type === 'predicate' ? answer.probability : null;
}

function toChoiceProbability(answer: Answer, value: string): number | null {
  if (answer.type !== 'choice') {
    return null;
  }
  return answer.probabilities.find((p) => p.value === value)?.probability ?? 0;
}

function toScore(answer: Answer): ScoreValue | null {
  if (answer.type !== 'score') {
    return null;
  }
  const levels: number[] = [];
  for (const { value, probability } of answer.probabilities) {
    levels[value] = probability;
  }
  return { score: answer.score, levels: Array.from(levels, (p) => p ?? 0) };
}

/** The decision table cannot run without these, so a refusal is an error. */
function requireScore(answer: Answer, name: string): ScoreValue {
  const score = toScore(answer);
  if (!score) {
    throw new Error(`Jev did not answer "${name}" (got ${answer.type})`);
  }
  return score;
}
