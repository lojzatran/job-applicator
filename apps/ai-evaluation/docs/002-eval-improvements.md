# Improvements after Evaluation 1

After [the first evaluation](001-eval.md) I got a baseline and candidate models I would like to focus on. I picked 2 models:

- `baseten/elephant-1` - this model had 82% accuracy in the first evaluation and costs only $0.04 per 1M input token (output token is free). Also, the latency was per request for P99 was between 0,5 - 0,7 seconds.
- `google/gemma-4-31b-it` - this model had 90% accuracy in the first evaluation and costs only $0.14 / $0.40
  per 1M. Additionally, it is an open-weight model by Google. The only concern I have now is the latency that is 14,22s for P99. That might be a glitch during test, but it is something that needs to be verified further.

> Note: For these improvements I have to change LangSmith account and reran some tests again as I have a free account, and it was out of free credits. So the links and runs are different from the ones in the Evaluation 1.

## Improving baseten/elephant-1

### 1

First session: https://eu.smith.langchain.com/public/49fd7e0a-d6fa-4632-9c6e-e5807134f594/d/compare?selectedSessions=3f4d28b8-7459-4faf-b447-216d24c91f54

In the code to calculate matching job I have [this condition](../../worker/src/app/ai/job-evaluator/jev/job-fit.decision.ts):

```js
const MIN_LEVEL_SCORE = 1.5;

if (answers.roleMatch.score < MIN_LEVEL_SCORE) {
  return {
    kind: JobEvaluationDecision.DISMISS,
    fit,
    reason: 'role_mismatch',
  };
}
```

Role match is defined by [this score question](../../worker/src/app/ai/job-evaluator/jev/job-fit.questions.ts):

```
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
```

This means that if the role is `different_profession` or more `neighbouring_field` than `same_role_other_stack`, it will be automatically dismissed. This could dismiss cases like when the processed CV has enough qualifications for the job, but never worked in the field before. This should be taken into account and potentially apply for this job.

#### Example

I will explain the findings [on one example from the run](./002-eval/example-1.json). We have a job ad

```
https://www.startupjobs.cz/nabidka/108845/obchodnik-v-it-firme-diky-vysokym-marzim-softwaru-vydelavej-az-150k-s-moznosti-remote
Sales Representative at an IT Company

We welcome both junior and experienced salespeople. Your mindset matters more than your CV.

We're a young team and want to work with people who are on the same wavelength.

Active in sports. You don't have to be a pro, but sports need to be part of your life. We all play sports here too. 💪

Ambitious and resilient. Sales isn't for everyone. You need to be able to handle rejection.

A good communicator. You're comfortable picking up the phone, sending a message, and going to meetings.

Some sales experience is a plus. Even a part-time retail job counts, but a willingness to learn matters most.
```

and the shortened [CV](../src/node-job-evaluator/data/cvs.ts#L111)

```
Summary: I'm an open-minded, motivated team player who works well independently, enjoys meeting people and learning new skills, and loves sports and travel.


Experiences:
CETIN (Business Intelligence Analyst) — Administered Microsoft Fabric, built a Python-based data warehouse framework in Databricks, and developed Power BI reports.

Awsbi.com (Awesome Business Intelligence) — Teaches practical Power BI and Microsoft Fabric skills on YouTube.

dolphin consulting (Business Intelligence Consultant) — Built Power BI models and dashboards for MSD and Organon, streamlined tax workflows with Power Apps and Dataverse, and trained Power BI users.

con4PAS, a.s. (SAP C4C Consultant) — Delivered SAP CRM implementations from requirements analysis to go-live, working directly with customers and training their teams.

4P&P, spol. s. r. o. (Sales Promotion) — Promoted products through tastings, sampling, presentations, events, competitions, roadshows, and outdoor sales.
```

You could see that the person has enough required experience to work on this position. He/she just never worked on similar position before.

System one model evaluated core requirements like this

```
"core_requirements": {
  "confidence": 0.41860931893071984,
  "probabilities": [
    {
      "label": "none",
      "probability": 0.041193077332883465,
      "value": 0
    },
    {
      "label": "few",
      "probability": 0.20850646049883528,
      "value": 1
    },
    {
      "label": "most",
      "probability": 0.4598023962636032,
      "value": 2
    },
    {
      "label": "all",
      "probability": 0.29049806590467797,
      "value": 3
    }
  ],
  "score": 1.9996054507400758,
  "type": "score"
},
```

and role match

```
"role_match": {
  "confidence": 0.2236074989126735,
  "probabilities": [
    {
      "label": "different_profession",
      "probability": 0.5221651957234542,
      "value": 0
    },
    {
      "label": "neighbouring_field",
      "probability": 0.23204065858819375,
      "value": 1
    },
    {
      "label": "same_role_other_stack",
      "probability": 0.19303059456592309,
      "value": 2
    },
    {
      "label": "same_role_same_stack",
      "probability": 0.05276355112242885,
      "value": 3
    }
  ],
  "score": 0.7763925010873265,
  "type": "score"
},
```

According to the model, the CV has `most` of `core_requirements`, but the `role_match` is `different_profession`.

#### Change

The change was following:

```
const STRONG_CORE_MATCH_PROBABILITY = 0.75;

const hasStrongCoreMatch =
    mostCoreRequirementsProbability + allCoreRequirementsProbability >= STRONG_CORE_MATCH_PROBABILITY;

if (isRoleMismatch && !hasStrongCoreMatch) {
    return {
      kind: JobEvaluationDecision.DISMISS,
      fit,
      reason: 'role_mismatch',
    };
  }
...
  if (isRoleMismatch) {
    // the person never worked in this kind of role before,
    // but has most or all the required skills
    return {
      kind: JobEvaluationDecision.UNCERTAIN,
      fit,
      reason: 'role_mismatch_with_strong_core_match',
    };
  }
```

Now it is taken into account the fact that role does not match the CV, but the model thinks there is strong match in core requirements. The number 0.75 (75% probability) is taken from the first session so that the most cases will pass.

#### Result

The run after I made those changes in code: https://eu.smith.langchain.com/o/e1f0d51d-9997-4ad6-b085-334de8a17776/a/-/datasets/0d8f759d-74f9-42b6-ac92-018c3124b30f/compare?selectedSessions=b247cd0b-c0fe-47cc-8b38-2ee3cd16b96e

**Accuracy changed from 0.82 to 0.9. Recall changed from 0.31 to 0.62 while Precision stays the same 1.00.**
