import { OpenAIDecisions } from '@langchain/openai';
import { env } from '../../../utils/env';
import { DECISION_MODEL } from '../ai.constants';

function createAiGatewayDecision(model: string) {
  return new OpenAIDecisions({
    apiKey: env.AI_GATEWAY_API_KEY,
    model: model,
    configuration: {
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    },
  });
}

export const decisionProvider = {
  provide: DECISION_MODEL,
  useFactory: createAiGatewayDecision,
};
