import { Inject, Injectable } from '@nestjs/common';
import { AgentBuilder } from './AgentBuilder';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { COVER_LETTER_GENERATOR_LLM, JOB_EVALUATOR_LLM } from '../ai.constants';
import { Job } from '../../jobs/types';

@Injectable()
export class AgentService {
  constructor(
    @Inject(JOB_EVALUATOR_LLM) private readonly jobEvaluatorLlm: BaseChatModel,
    @Inject(COVER_LETTER_GENERATOR_LLM)
    private readonly coverLetterGeneratorLlm: BaseChatModel,
  ) {}

  async executeAgent(jobs: Job[], maxJobs: number, cvText: string) {
    const agentBuilder = new AgentBuilder(
      this.jobEvaluatorLlm,
      this.coverLetterGeneratorLlm,
    );
    const agent = agentBuilder.build();
    const result = await agent.stream({
      cvText: cvText,
      maxAppliedJobs: maxJobs,
      jobs: jobs,
    });

    for await (const chunk of result) {
      console.log(chunk);
    }
  }
}
