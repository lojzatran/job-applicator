# Evaluation 1

According to the [eval ADR](../../../docs/adr/adr-001-eval-strategy-for-job-matching.md), this is the first round of evaluation.

## Hypotheses

Before testing, I have hypotheses I would like to verify:

1. LLM will be the most precise, then System One model, then embeddings.
2. Embedding will be fastest, then System One model, then LLM.
3. LLM will cost the most. Embeddings will cost similar to System One model.
4. Threshold closer to one for embeddings and System One models will increase recall, but lowers precision.

## Test models

Following models will be used:

1. LLM: deepseek/deepseek-v4.1-flash-1017, reasoning: medium.
2. Embedding: cohere/embed-v5.0-fast
3. System One: typesafe-ai/jev-1.14.0

All models are hosted on Vercel AI Gateway.

### Model's choice reasoning

1. **Cost** - as this is a demo app, my budget is limited. Therefore, I am choosing only the cheapest models as I would do in production for this app as well. However, they cannot be free models as these models are rate-limited and could skew the final results.
2. **Multilanguage support** - both CV and jobs could be in English and Czech, therefore models need to be trained on both languages.
3. **Hosted in the cloud** - my laptop is not strong enough to effectively run the models. And in production I would use hosted models.
4. **Limited time** - it would be nice to test and compare more models, different reasonings and settings. However, this is only a demo eval, so I cannot spend too much time in this.
5. **No fine-tuned models** - currently I do not have enough data for fine-tuning. I also don't have yet any experiences with fine-tuning.

## System one model evaluation

### Prerequisites

- All models are picked by me from the available [AI Gateway models](https://vercel.com/ai-gateway/models?modality=decision).
- Each model I ran only once with all the examples.
- In this first run I did not include the cost nor token counting yet. The numbers you see are automatically taken from LangChain.

### Result

You can look at the detailed results here: https://smith.langchain.com/public/a4a89b34-a925-41fd-aa87-f87142856b6a/d

### Comments

- `heygen/heygen-decision-1-turbo` is the best decision model. The cost was however the second highest, it costs 0.10 USD for 64 evaluations.
- `heygen/heygen-decision-1-turbo` is really faster than its non-turbo version `heygen/heygen-decision-1`, doubling its speed (see P50 and P99 columns). The cost for `heygen/heygen-decision-1` is also much higher, costing around 0.37 USD vs 0.10 USD for 64 evaluations.
- `baseten/elephant-1` seems to be the most cost-effective model. It costs less than 0.01 USD for 64 evaluations and f1 only few points behind the best model. P99 is also the second best, so it is one of the fastests models.
- `google/gemini-decision-1` didn't end that well. It also has the slowest P99. I was expecting it to be one of the best as Google is known for having good multilanguage models.
