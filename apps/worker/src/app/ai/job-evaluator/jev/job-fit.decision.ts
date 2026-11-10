import type { JobEvaluation } from '../job-evaluator';
import {
  BLOCKERS,
  type JobFitAnswers,
  type ScoreValue,
} from './job-fit.answers';

/**
 * MAX_LEVEL corresponds to the number of choices (max index) we have in the score questions.
 * We divide the sum of (score * index) returned by Jev
 * by this number to have an average score to calculate later.
 */
const MAX_LEVEL = 3;
const YES = 0.7;
const NO = 0.3;
const MIN_LEVEL_SCORE = 1.5;
const APPLY_FIT = 0.75;
const DISMISS_FIT = 0.6;
const SENIORITY_GAP = 0.6;
const TWO_PEAKS_MASS = 0.35;

/**
 * How an `uncertain` decision ends up. Open product decision:
 * `dismiss` keeps the evaluation strict, like the previous LLM prompt.
 */
export const UNCERTAIN_VERDICT: JobEvaluation['verdict'] = 'apply';

export type JobFitDecision =
  | { kind: 'apply'; fit: number }
  | { kind: 'dismiss'; fit: number; reason: string }
  | { kind: 'uncertain'; fit: number; reason: string };

export function decideJobFit(answers: JobFitAnswers): JobFitDecision {
  const fit = computeFit(answers);

  const isBlockerPresent = BLOCKERS.find(
    (b) => (answers.blockers[b] ?? 0) > YES,
  );
  if (isBlockerPresent)
    return { kind: 'dismiss', fit, reason: isBlockerPresent };

  // A two-peaked answer makes the average meaningless, so it must not trigger the threshold.
  const isRoleMatchSplit = isTwoPeaked(answers.roleMatch);
  const isCoreRequirementsSplit = isTwoPeaked(answers.coreRequirements);
  if (!isRoleMatchSplit && answers.roleMatch.score < MIN_LEVEL_SCORE) {
    return { kind: 'dismiss', fit, reason: 'role_mismatch' };
  }
  if (
    !isCoreRequirementsSplit &&
    answers.coreRequirements.score < MIN_LEVEL_SCORE
  ) {
    return { kind: 'dismiss', fit, reason: 'missing_core_requirements' };
  }
  if (seniorityTooHigh(answers)) {
    return { kind: 'dismiss', fit, reason: 'seniority_gap' };
  }

  // A refused blocker counts as unsettled, never as "no".
  const unsettled = BLOCKERS.find((b) => (answers.blockers[b] ?? NO) >= NO);
  if (unsettled) {
    return { kind: 'uncertain', fit, reason: `unsettled_${unsettled}` };
  }
  if (isRoleMatchSplit) {
    return { kind: 'uncertain', fit, reason: 'role_match_split' };
  }
  if (isCoreRequirementsSplit) {
    return { kind: 'uncertain', fit, reason: 'core_requirements_split' };
  }

  if (fit >= APPLY_FIT) return { kind: 'apply', fit };
  if (fit < DISMISS_FIT) return { kind: 'dismiss', fit, reason: 'low_fit' };
  return { kind: 'uncertain', fit, reason: 'borderline_fit' };
}

export function toVerdict(decision: JobFitDecision): JobEvaluation['verdict'] {
  return decision.kind === 'uncertain' ? UNCERTAIN_VERDICT : decision.kind;
}

/** 0–1. Nice-to-have only adds to the fit; jobs without it are not penalized. */
export function computeFit(answers: JobFitAnswers): number {
  const core = answers.coreRequirements.score / MAX_LEVEL;
  const role = answers.roleMatch.score / MAX_LEVEL;
  if ((answers.niceToHaveListed ?? 0) > YES && answers.niceToHaveCoverage) {
    const nice = answers.niceToHaveCoverage.score / MAX_LEVEL;
    return 0.5 * core + 0.4 * role + 0.1 * nice;
  }
  return (0.5 * core + 0.4 * role) / 0.9;
}

function seniorityTooHigh(answers: JobFitAnswers): boolean {
  return (
    (answers.seniorityStated ?? 0) > YES &&
    (answers.jobExpectsMoreSeniority ?? 0) > SENIORITY_GAP
  );
}

/**
 * For the case when the model returns score with higher probability at the lowest value
 * and highest value - it could mean that model is not sure what to pick and this is not visible
 * from the average.
 **/
function isTwoPeaked({ levels }: ScoreValue): boolean {
  const low = (levels[0] ?? 0) + (levels[1] ?? 0);
  const high = levels[MAX_LEVEL] ?? 0;
  return low >= TWO_PEAKS_MASS && high >= TWO_PEAKS_MASS;
}
