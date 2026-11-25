import type { Blocker, JobFitAnswers } from './job-fit.answers';
import { computeFit, decideJobFit } from './job-fit.decision';

const weakRoleMatch = { score: 0.4, levels: [0.6, 0.4, 0, 0] };
const noBlocker = { doesNotMeet: 0.02, unverified: 0.03 };

function answers(overrides: Partial<JobFitAnswers> = {}): JobFitAnswers {
  return {
    roleMatch: { score: 3, levels: [0, 0, 0, 1] },
    coreRequirements: { score: 2.8, levels: [0, 0, 0.2, 0.8] },
    niceToHaveListed: 0.1,
    niceToHaveCoverage: null,
    seniorityStated: 0.1,
    jobExpectsMoreSeniority: 0.1,
    blockers: {
      spoken_language: noBlocker,
      domain_experience: noBlocker,
      formal_qualification: noBlocker,
    },
    ...overrides,
  };
}

function withBlocker(
  name: Blocker,
  assessment: JobFitAnswers['blockers'][Blocker],
): JobFitAnswers {
  const base = answers();
  return { ...base, blockers: { ...base.blockers, [name]: assessment } };
}

describe('decideJobFit', () => {
  it('applies without a reason when the role and core requirements match', () => {
    const decision = decideJobFit(answers());
    expect(decision.kind).toBe('apply');
    expect(decision).not.toHaveProperty('reason');
  });

  it('dismisses when a blocker is clearly present', () => {
    expect(
      decideJobFit({
        ...withBlocker('spoken_language', {
          doesNotMeet: 0.9,
          unverified: 0.05,
        }),
        roleMatch: weakRoleMatch,
      }),
    ).toMatchObject({ kind: 'dismiss', reason: 'spoken_language_not_met' });
  });

  it('dismisses a role mismatch when the core match probability is below 48%', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: weakRoleMatch,
          coreRequirements: { score: 1.94, levels: [0, 0.53, 0, 0.47] },
        }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'role_mismatch' });
  });

  it('marks a role mismatch as uncertain when most or all core requirements have 48% probability', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: weakRoleMatch,
          coreRequirements: { score: 1.72, levels: [0, 0.52, 0.24, 0.24] },
        }),
      ),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'role_mismatch_with_strong_core_match',
    });
  });

  it('dismisses when most core requirements are missing', () => {
    expect(
      decideJobFit(
        answers({ coreRequirements: { score: 1, levels: [0, 1, 0, 0] } }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'missing_core_requirements' });
  });

  it('dismisses a stated seniority clearly above the candidate', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: weakRoleMatch,
          seniorityStated: 0.9,
          jobExpectsMoreSeniority: 0.8,
        }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'seniority_gap' });
  });

  it('ignores the seniority comparison when the job states no seniority', () => {
    expect(
      decideJobFit(
        answers({ seniorityStated: 0.1, jobExpectsMoreSeniority: 0.9 }),
      ),
    ).toMatchObject({ kind: 'apply' });
  });

  it.each([
    { doesNotMeet: 0.4, unverified: 0.05 },
    { doesNotMeet: 0.05, unverified: 0.4 },
  ])('marks an unsettled blocker as uncertain', (assessment) => {
    expect(
      decideJobFit(withBlocker('domain_experience', assessment)),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'domain_experience_unverified',
    });
  });

  it('evaluates the two blocker probabilities separately', () => {
    expect(
      decideJobFit(
        withBlocker('domain_experience', {
          doesNotMeet: 0.18,
          unverified: 0.16,
        }),
      ),
    ).toMatchObject({ kind: 'apply' });
  });

  it('marks an otherwise suitable job with an unverified language as uncertain', () => {
    expect(
      decideJobFit(
        withBlocker('spoken_language', {
          doesNotMeet: 0.05,
          unverified: 0.9,
        }),
      ),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'spoken_language_unverified',
    });
  });

  it('treats a refused blocker as unsettled, not as "no"', () => {
    expect(
      decideJobFit(
        withBlocker('formal_qualification', {
          doesNotMeet: null,
          unverified: 0.05,
        }),
      ),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'formal_qualification_unverified',
    });
  });

  it('marks a two-peaked core requirements answer as uncertain', () => {
    expect(
      decideJobFit(
        answers({
          coreRequirements: { score: 1.7, levels: [0.4, 0, 0.1, 0.5] },
        }),
      ),
    ).toMatchObject({ kind: 'uncertain', reason: 'core_requirements_split' });
  });

  it('does not dismiss two-peaked core requirements by their average', () => {
    expect(
      decideJobFit(
        answers({
          coreRequirements: { score: 1.35, levels: [0.55, 0, 0, 0.45] },
        }),
      ),
    ).toMatchObject({ kind: 'uncertain', reason: 'core_requirements_split' });
  });

  it('does not dismiss a two-peaked role match by its average', () => {
    expect(
      decideJobFit(
        answers({ roleMatch: { score: 1.35, levels: [0.55, 0, 0, 0.45] } }),
      ),
    ).toMatchObject({ kind: 'uncertain', reason: 'role_match_split' });
  });

  it('marks a two-peaked role match above the threshold as uncertain', () => {
    expect(
      decideJobFit(
        answers({ roleMatch: { score: 1.92, levels: [0.36, 0, 0, 0.64] } }),
      ),
    ).toMatchObject({ kind: 'uncertain', reason: 'role_match_split' });
  });

  it('still dismisses a two-peaked role match for missing core requirements', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: { score: 1.35, levels: [0.55, 0, 0, 0.45] },
          coreRequirements: { score: 1, levels: [0, 1, 0, 0] },
        }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'missing_core_requirements' });
  });

  it('marks a borderline fit as uncertain', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: { score: 2, levels: [0, 0, 1, 0] },
          coreRequirements: { score: 2, levels: [0, 0, 1, 0] },
        }),
      ),
    ).toMatchObject({ kind: 'uncertain', reason: 'borderline_fit' });
  });

  it('dismisses a low fit even when a requirement needs verification', () => {
    expect(
      decideJobFit({
        ...withBlocker('spoken_language', {
          doesNotMeet: 0.05,
          unverified: 0.9,
        }),
        roleMatch: { score: 1.6, levels: [0, 0.4, 0.6, 0] },
        coreRequirements: { score: 1.6, levels: [0, 0.4, 0.6, 0] },
      }),
    ).toMatchObject({ kind: 'dismiss', reason: 'low_fit' });
  });
});

describe('computeFit', () => {
  it('does not penalize jobs without nice-to-have requirements', () => {
    expect(computeFit(answers())).toBeCloseTo((0.5 * (2.8 / 3) + 0.4) / 0.9);
  });

  it('adds nice-to-have coverage when the job lists it', () => {
    const fit = computeFit(
      answers({
        niceToHaveListed: 0.9,
        niceToHaveCoverage: { score: 3, levels: [0, 0, 0, 1] },
      }),
    );
    expect(fit).toBeCloseTo(0.5 * (2.8 / 3) + 0.4 + 0.1);
  });

  it('ignores coverage when the job lists no nice-to-have', () => {
    const fit = computeFit(
      answers({
        niceToHaveListed: 0.1,
        niceToHaveCoverage: { score: 0, levels: [1, 0, 0, 0] },
      }),
    );
    expect(fit).toBeCloseTo(computeFit(answers()));
  });
});
