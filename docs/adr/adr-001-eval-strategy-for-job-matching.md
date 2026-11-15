# Eval strategy for CV-Job matching

## Context
To be able to find suitable jobs for the user's CV, we could use different types of AI models to do so. There were originally 2 types of models: LLM and embeddings. Recently, there was another type of model that came into consideration: System-one AI models. Therefore, we need a way to compare them between each other.
1. LLM
2. Embeddings
3. System One models

## Decision
We use the dataset that was pre-annotated by another LLM and verified by a human (me). We will use various metrics that are comparable for LLM, embeddings and system one models. We run each model 3 times and report the mean and individual results for each metric. The output of each test is if the job is suitable for the supplied CV or not. The tests are therefore pass/fail kind of tests and fully automated.

## Alternatives
- LLM-as-a-Judge - not applicable in this case as we measure exact numbers.
- Rubric scoring - not right now as we check only yes/no question, but this might be changed in the next version when we need a reason why a particular job is not picked.

## Dataset
The golden dataset contains 50 different jobs and 10 different CVs. Jobs are fetched from real job portals. CVs are the real CVs from my linkedin contacts or from other parts of the internet. The languages are both Czech and English. Every CV is checked through all the jobs and the suitable jobs are chosen, therefore we have 10x50 = 500 pairs. These pairs were pre-annotated by Codex and verified by a human (me).

## Metrics
### Definitions

Each pair consists of one CV and one job (in total 500 pairs).

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
- **Latency** = total elapsed time for the complete batch of 500 pairs.
- **Cost** = total cost of processing the complete batch of 500 pairs.

Report the number of failed pairs alongside the classification metrics. If a formula's denominator is zero (in case of error or no matching jobs found), report the metric as undefined. If both Precision and Recall are defined and equal to zero, report F1 as zero.

## Consequences

As I am the only person who verifies the golden dataset, the total number of CV and jobs pairs is limited to 500. 
