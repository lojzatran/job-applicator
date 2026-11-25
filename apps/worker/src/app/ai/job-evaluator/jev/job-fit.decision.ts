import {
  BLOCKERS,
  type JobFitAnswers,
  type ScoreValue,
} from './job-fit.answers';
import { JobEvaluationDecision, type JobEvaluationReason } from '@apps/shared';

/**
 * MAX_LEVEL corresponds to the number of choices (max index) we have in the score questions.
 * We divide the sum of (score * index) returned by Jev
 * by this number to have an average score to calculate later.
 */
const MAX_LEVEL = 3;
const YES = 0.7;
const NO = 0.3;
const MIN_LEVEL_SCORE = 1.5;
const STRONG_CORE_MATCH_PROBABILITY = 0.48;
const APPLY_FIT = 0.75;
const DISMISS_FIT = 0.6;
const SENIORITY_GAP = 0.6;
const TWO_PEAKS_MASS = 0.35;

export type JobFitDecision =
  | { kind: JobEvaluationDecision.APPLY; fit: number }
  | {
      kind: JobEvaluationDecision.DISMISS | JobEvaluationDecision.UNCERTAIN;
      fit: number;
      reason: JobEvaluationReason;
    };

export function decideJobFit(answers: JobFitAnswers): JobFitDecision {
  const fit = computeFit(answers);

  const confirmedBlocker = BLOCKERS.find(
    (blocker) => (answers.blockers[blocker]?.doesNotMeet ?? 0) > YES,
  );
  if (confirmedBlocker)
    return {
      kind: JobEvaluationDecision.DISMISS,
      fit,
      reason: `${confirmedBlocker}_not_met`,
    };

  // A two-peaked answer makes the average meaningless, so it must not trigger the threshold.
  const isRoleMatchSplit = isTwoPeaked(answers.roleMatch);
  const isCoreRequirementsSplit = isTwoPeaked(answers.coreRequirements);
  const isRoleMismatch =
    !isRoleMatchSplit && answers.roleMatch.score < MIN_LEVEL_SCORE;
  const [
    ,
    ,
    mostCoreRequirementsProbability = 0,
    allCoreRequirementsProbability = 0,
  ] = answers.coreRequirements.levels;
  const hasStrongCoreMatch =
    mostCoreRequirementsProbability + allCoreRequirementsProbability >=
    STRONG_CORE_MATCH_PROBABILITY;
  if (isRoleMismatch && !hasStrongCoreMatch) {
    return {
      kind: JobEvaluationDecision.DISMISS,
      fit,
      reason: 'role_mismatch',
    };
  }
  if (
    !isCoreRequirementsSplit &&
    answers.coreRequirements.score < MIN_LEVEL_SCORE
  ) {
    return {
      kind: JobEvaluationDecision.DISMISS,
      fit,
      reason: 'missing_core_requirements',
    };
  }
  if (seniorityTooHigh(answers)) {
    return {
      kind: JobEvaluationDecision.DISMISS,
      fit,
      reason: 'seniority_gap',
    };
  }
  if (isRoleMismatch) {
    // the person never worked in this kind of role before,
    // but has most or all the required skills
    return {
      kind: JobEvaluationDecision.UNCERTAIN,
      fit,
      reason: 'role_mismatch_with_strong_core_match',
    };
  }

  if (isRoleMatchSplit) {
    return {
      kind: JobEvaluationDecision.UNCERTAIN,
      fit,
      reason: 'role_match_split',
    };
  }
  if (isCoreRequirementsSplit) {
    return {
      kind: JobEvaluationDecision.UNCERTAIN,
      fit,
      reason: 'core_requirements_split',
    };
  }

  if (fit < DISMISS_FIT)
    return { kind: JobEvaluationDecision.DISMISS, fit, reason: 'low_fit' };

  const unsettled = BLOCKERS.find((blocker) => {
    const assessment = answers.blockers[blocker];
    return (
      (assessment?.doesNotMeet ?? NO) >= NO ||
      (assessment?.unverified ?? NO) >= NO
    );
  });
  if (unsettled) {
    return {
      kind: JobEvaluationDecision.UNCERTAIN,
      fit,
      reason: `${unsettled}_unverified`,
    };
  }

  if (fit >= APPLY_FIT) return { kind: JobEvaluationDecision.APPLY, fit };
  return {
    kind: JobEvaluationDecision.UNCERTAIN,
    fit,
    reason: 'borderline_fit',
  };
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
