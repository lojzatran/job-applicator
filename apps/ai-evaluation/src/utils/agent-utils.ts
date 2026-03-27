import { AgentBuilder } from '@apps/api/src/app/ai/langgraph/AgentBuilder';
import { ChatOllama } from '@langchain/ollama';

import { env } from './env';

export function createOllamaAgentGraph(model: string) {
  const llm = new ChatOllama({
    model,
    baseUrl: env.OLLAMA_BASE_URL,
  });

  return new AgentBuilder(llm, llm, llm).build();
}
