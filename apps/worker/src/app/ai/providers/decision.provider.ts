import { OpenAIDecisions } from '@langchain/openai';
import { env } from '../../../utils/env';
import { DECISION_MODEL } from '../ai.constants';

/** Returns `null` when no decisions model is configured, so the worker can still boot. */
function createAiGatewayDecision(): OpenAIDecisions | null {
  const model = env.AI_GATEWAY_DECISION_MODEL;
  if (!model) {
    return null;
  }
  return new OpenAIDecisions({
    apiKey: env.AI_GATEWAY_API_KEY,
    model,
    configuration: {
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    },
  });
}

export const decisionProvider = {
  provide: DECISION_MODEL,
  useFactory: createAiGatewayDecision,
};
