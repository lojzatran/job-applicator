import type { JobFitAnswers } from './job-fit.answers';
import { computeFit, decideJobFit, toVerdict } from './job-fit.decision';

function answers(overrides: Partial<JobFitAnswers> = {}): JobFitAnswers {
  return {
    roleMatch: { score: 3, levels: [0, 0, 0, 1] },
    coreRequirements: { score: 2.8, levels: [0, 0, 0.2, 0.8] },
    niceToHaveListed: 0.1,
    niceToHaveCoverage: null,
    seniorityStated: 0.1,
    jobExpectsMoreSeniority: 0.1,
    blockers: {
      spoken_language_missing: 0.05,
      domain_experience_missing: 0.05,
      formal_qualification_missing: 0.05,
    },
    ...overrides,
  };
}

function withBlocker(
  name: keyof JobFitAnswers['blockers'],
  probability: number | null,
): JobFitAnswers {
  const base = answers();
  return { ...base, blockers: { ...base.blockers, [name]: probability } };
}

describe('decideJobFit', () => {
  it('applies when the role and core requirements match', () => {
    expect(decideJobFit(answers())).toMatchObject({ kind: 'apply' });
  });

  it('dismisses when a blocker is clearly present', () => {
    expect(
      decideJobFit(withBlocker('spoken_language_missing', 0.9)),
    ).toMatchObject({ kind: 'dismiss', reason: 'spoken_language_missing' });
  });

  it('dismisses a different profession', () => {
    expect(
      decideJobFit(
        answers({ roleMatch: { score: 0.4, levels: [0.6, 0.4, 0, 0] } }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'role_mismatch' });
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
        answers({ seniorityStated: 0.9, jobExpectsMoreSeniority: 0.8 }),
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

  it('marks an unsettled blocker as uncertain', () => {
    expect(
      decideJobFit(withBlocker('domain_experience_missing', 0.5)),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'unsettled_domain_experience_missing',
    });
  });

  it('treats a refused blocker as unsettled, not as "no"', () => {
    expect(
      decideJobFit(withBlocker('formal_qualification_missing', null)),
    ).toMatchObject({
      kind: 'uncertain',
      reason: 'unsettled_formal_qualification_missing',
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

  it('dismisses a low fit', () => {
    expect(
      decideJobFit(
        answers({
          roleMatch: { score: 1.6, levels: [0, 0.4, 0.6, 0] },
          coreRequirements: { score: 1.6, levels: [0, 0.4, 0.6, 0] },
        }),
      ),
    ).toMatchObject({ kind: 'dismiss', reason: 'low_fit' });
  });
});

describe('toVerdict', () => {
  it('maps uncertain to the configured verdict', () => {
    expect(toVerdict({ kind: 'uncertain', fit: 0.7, reason: 'x' })).toBe(
      'dismiss',
    );
    expect(toVerdict({ kind: 'apply', fit: 0.9 })).toBe('apply');
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
