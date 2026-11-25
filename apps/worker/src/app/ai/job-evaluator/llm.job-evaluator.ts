import { Inject, Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { createLogger, JobEvaluationDecision } from '@apps/shared';
import { JOB_EVALUATOR_LLM } from '../ai.constants';
import { CvService } from '../../cv/cv.service';
import type { Job } from '../../jobs/types';
import type { CvInput, JobEvaluation, JobEvaluator } from './job-evaluator';

@Injectable()
export class LlmJobEvaluator implements JobEvaluator {
  private readonly logger = createLogger(LlmJobEvaluator.name);

  constructor(
    @Inject(JOB_EVALUATOR_LLM)
    private readonly jobEvaluatorLlm: BaseChatModel,
    private readonly cvService: CvService,
    private readonly dataSource: DataSource,
  ) {}

  async prepareCv(cvText: string): Promise<number> {
    const { id } = await this.cvService.ensureCvEntity(
      this.dataSource.manager,
      cvText,
    );
    return id;
  }

  async evaluate(cv: CvInput, job: Job): Promise<JobEvaluation> {
    const { isValidJob, score, reason } = await this.evaluateByLlm(
      cv.text,
      job,
    );
    if (isValidJob) {
      return { verdict: JobEvaluationDecision.APPLY, score: 1 };
    }

    const rejectionReason = reason?.trim();
    if (score == null || !rejectionReason) {
      throw new Error('LLM must return a score and reason for a rejected job');
    }

    return {
      verdict: JobEvaluationDecision.DISMISS,
      score,
      reason: rejectionReason,
    };
  }

  private async evaluateByLlm(cvText: string, job: Job) {
    const template = PromptTemplate.fromTemplate(`
          You are an experienced technical recruiter and hiring manager.

          Decide whether this job is worth applying to based on the candidate's ability to do the advertised work.

          RULES:
          - The candidate should meet most core requirements (not everything, but clearly relevant).
          - Ignore minor or nice-to-have requirements.
          - Focus on actual ability to do the job, not just keyword matching.
          - Count experience or seniority above the required level as meeting that requirement.
          - Do not infer salary expectations, lack of interest, boredom, or risk of early departure from the candidate's experience, qualifications, or seniority.
          - If the posting offers an alternative to prior experience, evaluate that route on its own terms. Use concrete accomplishments in related work as evidence. A different title or career path is insufficient grounds for rejection.
          - When the employer requires hands-on experience in a specific activity, look for evidence of doing that work at the required level. A tool in the skills list or years in an adjacent profession alone cannot establish that experience.
          - When the CV demonstrates the main work at the required level and the only gap is one supporting tool or method, return true.
          - Assess only the languages the employer explicitly requires. The language of the posting, the customer market and the location of the role do not establish an additional language requirement.
          - If the candidate meets the role requirements, return true when work location is the only uncertainty. Treat location as a blocker only when the candidate states a conflicting restriction. Past workplaces and sales territories do not establish such a restriction.

          INPUTS:
          1) Candidate CV:
          {cvText}

          2) Job Title:
          {jobTitle}

          3) Job Description:
          {jobDescription}

          OUTPUT:
          - Decide "isValidJob" first, using RULES above. Return a JSON object with "isValidJob" set to true if the candidate meets most core requirements.
          - Set "isValidJob" to false otherwise.
          - For a rejection, give a numeric "score" from 0 to 1 for overall fit. Higher scores mean a closer match to the role's main responsibilities and core requirements.
          - In "reason", explain the rejection you already decided on in one short sentence based on the posting and the CV. Describe missing evidence for a stated requirement as unverified.
          - For an acceptance, set "score" and "reason" to null.
          - Example: {{ "isValidJob": true, "score": null, "reason": null }}
        `);

    const prompt = await template.invoke({
      cvText,
      jobTitle: job.title,
      jobDescription: job.description,
    });

    const response = await this.jobEvaluatorLlm
      .withStructuredOutput(
        z.object({
          isValidJob: z.boolean(),
          score: z
            .number()
            .min(0)
            .max(1)
            .nullish(),
          reason: z.string().nullish(),
        }),
      )
      .invoke(prompt);
    this.logger.info(`Evaluated job by LLM: ${JSON.stringify(response)}`);
    return response;
  }
}
