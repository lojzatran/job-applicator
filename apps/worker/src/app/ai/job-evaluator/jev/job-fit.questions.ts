import type { Questions } from '@langchain/openai';

/**
 * All question wording for the Jev job evaluation lives here.
 * See docs/jev-job-evaluation.md for why each question is phrased this way.
 */
export const JOB_FIT_QUESTIONS = {
  role_match: {
    type: 'score',
    instructions:
      'How closely does the role described in `job` match the work the candidate has done, as shown in `candidate`?',
    levels: [
      {
        label: 'different_profession',
        description:
          'The job is a different profession from every role the candidate has held, for example a sales or design role for a software engineer.',
      },
      {
        label: 'neighbouring_field',
        description:
          'The job is in a neighbouring field, for example a DevOps or data engineering role for a backend developer.',
      },
      {
        label: 'same_role_other_stack',
        description:
          'The job is the same kind of role the candidate has held, but built on a different main technology stack.',
      },
      {
        label: 'same_role_same_stack',
        description:
          'The candidate has held the same kind of role on the same main technology stack.',
      },
    ],
  },

  core_requirements: {
    type: 'score',
    instructions:
      'How many of the must-have requirements in `job.description` does the CV in `candidate` show? Count only requirements the job lists as required. Items under "nice to have", "bonus" or "a plus", and the benefits the company offers, are not must-have requirements.',
    levels: [
      {
        label: 'none',
        description: 'The CV shows none of the must-have requirements.',
      },
      {
        label: 'few',
        description:
          'The CV shows a few must-have requirements, but most of the core technologies or responsibilities are missing.',
      },
      {
        label: 'most',
        description:
          'The CV shows most must-have requirements, and one or two are missing.',
      },
      {
        label: 'all',
        description: 'The CV shows every must-have requirement.',
      },
    ],
  },

  nice_to_have_listed: {
    type: 'predicate',
    instructions:
      'Does `job.description` list optional requirements, such as items under "nice to have", "bonus" or "a plus"?',
  },

  nice_to_have_coverage: {
    type: 'score',
    instructions:
      'How many of the optional requirements in `job.description`, such as items under "nice to have", "bonus" or "a plus", does the CV in `candidate` show?',
    levels: [
      {
        label: 'none',
        description: 'The CV shows none of the optional requirements.',
      },
      {
        label: 'some',
        description: 'The CV shows one or a few of the optional requirements.',
      },
      {
        label: 'most',
        description: 'The CV shows most of the optional requirements.',
      },
      {
        label: 'all',
        description: 'The CV shows every optional requirement.',
      },
    ],
  },

  seniority_stated: {
    type: 'predicate',
    instructions:
      'Does `job` state a seniority level, such as "Senior", "Lead" or "Junior", or a minimum number of years of experience?',
  },

  seniority: {
    type: 'choice',
    instructions:
      'How does the seniority `job` asks for compare with the seniority of the candidate in `candidate`?',
    choices: {
      job_expects_more_seniority:
        'The job asks for a higher level than the candidate has held, for example a lead or principal role for someone whose highest title is mid-level.',
      same_seniority:
        "The level the job asks for matches the candidate's most recent title.",
      job_expects_less_seniority:
        "The job is clearly below the candidate's level, for example a junior role or internship for a senior engineer.",
    },
  },

  spoken_language_missing: {
    type: 'predicate',
    instructions:
      'Does `job.description` require a spoken language, such as fluent German, that does not appear anywhere in `candidate`? Programming languages such as Java or Python are not spoken languages.',
  },

  domain_experience_missing: {
    type: 'predicate',
    instructions:
      "Does `job.description` require experience in a specific business domain, such as banking, healthcare or e-commerce, that the candidate's employers and projects in `candidate` do not show? A job that only describes the company's own industry does not require experience in it.",
  },

  formal_qualification_missing: {
    type: 'predicate',
    instructions:
      'Does `job.description` require a formal qualification, such as a specific university degree, a certification or a security clearance, that does not appear in `candidate`? A qualification listed only as preferred is not required.',
  },
} as const satisfies Questions;

export type JobFitQuestions = typeof JOB_FIT_QUESTIONS;
