/** Codes for the primary reason behind a job evaluation verdict. */
export const JOB_EVALUATION_REASON_CODES = [
  'spoken_language_not_met',
  'spoken_language_unverified',
  'domain_experience_not_met',
  'domain_experience_unverified',
  'formal_qualification_not_met',
  'formal_qualification_unverified',
  'required_skill_unverified',
  'role_mismatch',
  'missing_core_requirements',
  'seniority_gap',
  'role_mismatch_with_strong_core_match',
  'role_match_split',
  'core_requirements_split',
  'low_fit',
  'borderline_fit',
  'insufficient_job_description',
  'similarity_threshold_not_met',
  'work_arrangement_mismatch',
  'compensation_mismatch',
  'work_authorization_unverified',
] as const;

export type JobEvaluationReason = (typeof JOB_EVALUATION_REASON_CODES)[number];
