# Evaluation 1

According to the [eval ADR](../../../docs/adr/adr-001-eval-strategy-for-job-matching.md), this is the first round of evaluation. The costs reported in this article are the amounts billed by Vercel AI Gateway, as shown in my dashboard.

## Hypotheses

Before testing, I have hypotheses I would like to verify:

1. LLM will be the most accurate with the best f1, then System One model, then embeddings.
2. Embedding will be fastest, then System One model, then LLM.
3. LLM will cost the most. Embeddings will cost similar to System One model.

### Model's choice reasoning

1. **Cost** - as this is a demo app, my budget is limited. Therefore, I am choosing only the cheapest models as I would do in production for this app as well. However, they cannot be free models as these models are rate-limited and could skew the final results.
2. **Multilanguage support** - both CV and jobs could be in English and Czech, therefore models need to be trained on both languages.
3. **Hosted in the cloud** - my laptop is not strong enough to effectively run the models. And in production I would use hosted models.
4. **Limited time** - it would be nice to test and compare more models, different reasonings and settings. However, this is only a demo eval, so I cannot spend too much time in this.
5. **No fine-tuned models** - currently I do not have enough data for fine-tuning. I also don't have yet any experiences with fine-tuning.

## System one model evaluation

System one models decides if the job is a fit or not [based on set of questions](../../worker/src/app/ai/job-evaluator/jev/job-fit.questions.ts), where the whole job title and description is passed together with the parsed CV. For this first eval I take into account the following matching criteria:

1. blockers - if there are must-have requirements like spoken language (e.g. Spanish is required), domain expertise (e.g. dentistry), formal qualification (e.g. PhD), senior experiences are required, and the CV doesn't have it, then the job is immediately dismissed.
2. core requirements - this has the most weight in the final score.
3. role match - this has slightly less weight than core requirements.
4. nice-to-have requirements - this could add a small bonus point if there is a match

### Prerequisites

- All models are picked by me from the available [AI Gateway models](https://vercel.com/ai-gateway/models?modality=decision).
- Each model I ran only once with all the examples.

### Result

You can look at the detailed results here: https://smith.langchain.com/public/7419c995-bb3b-4f6b-b610-67c62a2f9456/d

### Comments

- `heygen/heygen-decision-1-turbo` is the best decision model. The cost was however the second highest, it costs 0.10 USD for 50 evaluations.
- `baseten/elephant-1` seems to be the most cost-effective model. It costs less than 0.01 USD for 50 evaluations and f1 only few points behind the best model. P99 is also around 0,5s, so it's in the faster range of models.
- `google/gemini-decision-1` didn't end that well. It also has the slowest P99 together with `microsoft/microsoft-decision-1`. I was expecting it to be one of the best as Google is known for having good multilanguage models.

## Embeddings model evaluation

For embeddings I first [create embeddings for each part of the parsed CV (summary, skills, experience, projects, education, other)](../../worker/src/app/cv/embeddings/cv-summary-embeddings.service.ts). Then [each job is compared to every part of the CV embeddings](../../worker/src/app/cv/embeddings/cv-embeddings.repository.ts) to get cosine similarity, and from the similarities the final score is calculated. This calculation is done in the db, so there are db calls involved as well.

### Prerequisites

- All models are picked by me from the available [AI Gateway models](https://vercel.com/ai-gateway/models?modality=retrieval).
- Each model I ran only once with all the examples.

### Result

You can look at the detailed results here: https://smith.langchain.com/public/11bf3ef3-3c75-427f-9a4b-20dbc6d6d844/d

### Comments

- I must say I was not sure from the beginning if embeddings is a right choice for this. The problem is job description often contains a lot of unnecessary details and fluff around. One way we could improve is to extract the sections from the job description, but job description usually don't have any structure, and I didn't want to have LLM involved.
- I expected Google embeddings to be the best.
- Qwen embedding model was very slow. I tried multiple times and they were always slow.
- The price was very cheap. The most expensive model `voyage/voyage-3-large` cost 0.01 USD and others cost 0 USD.

## LLM

Evaluating with LLM is the most straightforward. The application supplies the parsed CV and job description, set structured output as a response and make a call.

### Result

You can look at the detailed results here: https://smith.langchain.com/public/1a8ec3cd-917b-488d-ac0e-495cc33a876f/d

### Comments

- `openai/gpt-6.1-terra` has the highest score and in general OpenAI models did quite a good job. This could be explained partly because I used Codex to pre-select and evaluate the eval examples, so this could be biased, though I later checked the examples manually.
- I am surprised to see `google/gemma-4-31b-it` doing very well here, even better than Gemini models. For the total price 0.02 USD it's the best performance/cost model so far. To compare, the best model `openai/gpt-6.1-terra` cost 0.30 USD (15x higher).

## Hypotheses verification

1. LLM will be the most accurate with the best f1, then System One model, then embeddings. ✅
2. Embedding will be fastest, then System One model, then LLM. ❌ System One was fastest with most calls returning a response below 1s. Then it is embeddings, except for alibaba/qwen3-embedding-8b that has the highest latency of all models. I am actually very surprised that LLM calls were very fast most of them times and actually usable.
3. LLM will cost the most. Embeddings will cost similar to System One model. ❌ I should've split it into 2 hypothesis. LLM will cost the most is true. However, embeddings costs much less. LLM costs depends on the chosen model, most of the LLM models I chose were actually very close to pricier System One models.

## Next steps

This first test will serve as a baseline for my next improvements. I will now focus more on System One and LLM, especially on the models that did good in eval process and has lower prices. I will not work on embeddings for now. As this is a job matching system, the more important metric is recall. It is better to retrieve more jobs and have some irrelevant ones than fewer right jobs, but miss a lot of them.

### Things to test in System One

- Check in details what were the probabilities and choices returned in the response for each question and tune the threshold to better reflect them.
- Check if there are other questions that could be asked to improve precision.

### Things to test in LLM

- Improve the prompt
- Try combining System One and LLM.
