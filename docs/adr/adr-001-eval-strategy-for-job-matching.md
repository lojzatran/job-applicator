# Eval strategy for CV-Job matching

## Context

To be able to find suitable jobs for the user's CV, we could use different types of AI models to do so. There were originally 2 types of models: LLM and embeddings. Recently, there was another type of model that came into consideration: System-one AI models. Therefore, we need a way to compare them between each other.

1. LLM
2. Embeddings
3. System One models

## Goal

Given a CV and job title and description, the model should return:

1. true if the job is suitable for the CV.
2. false if the job is not suitable for the CV.
3. uncertain if the model cannot clearly decide.

## Decision

We use the dataset that was pre-annotated by another LLM and verified by a human (me). We will use various metrics that are comparable for LLM, embeddings and system one models. We will run multiple models and compare them between each other. The criteria are defined [in the doc for every eval case](../../apps/ai-evaluation/docs). The output of each test is if the job is suitable for the supplied CV or not. The tests are therefore pass/fail kind of tests and fully automated.

## Alternatives

- LLM-as-a-Judge - not applicable in this case as we measure exact numbers.
- Rubric scoring - not right now as we check only yes/no question, but this might be changed in the next version when we need a reason why a particular job is not picked.

## Dataset

The golden dataset contains 50 different pairs of jobs and CVs. Jobs are fetched from real job portals. CVs are the real CVs from my linkedin contacts or from other parts of the internet. The languages are both Czech and English. Every CV is checked through all the jobs and the suitable jobs are chosen, therefore we have 5x10 = 50 pairs. These pairs were pre-annotated by Codex and verified by a human (me).

## Metrics

### Definitions

Each pair consists of one CV and one job (in total 50 pairs).

- `processedPairs`: pairs for which the model returned an answer.
- `aiMatchedPairs`: processed pairs that the model marked as matching (job is suitable for the CV).
- `allMatchedPairs`: processed pairs marked as matching in the dataset.
- `correctMatchedPairs`: pairs marked as matching by both the model and the dataset.
- `correctRejectedPairs`: pairs marked as not matching by both the model and the dataset.

### Formulas

- **Accuracy** = (`correctMatchedPairs` + `correctRejectedPairs`) / `processedPairs`
- **Precision** = `correctMatchedPairs` / `aiMatchedPairs`
- **Recall** = `correctMatchedPairs` / `allMatchedPairs`
- **F1** = 2 × Precision × Recall / (Precision + Recall)
- **Latency** = total elapsed time for the complete batch of 50 pairs.
- **Cost** = total cost of processing the complete batch of 50 pairs.

Report the number of failed pairs alongside the classification metrics. If a formula's denominator is zero (in case of error or no matching jobs found), report the metric as undefined. If both Precision and Recall are defined and equal to zero, report F1 as zero.

## Consequences

As I am the only person who verifies the golden dataset, the total number of CV and jobs pairs is limited to 50.
