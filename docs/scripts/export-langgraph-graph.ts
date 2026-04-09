import { LanggraphService } from '../../apps/api/src/app/ai/langgraph/langgraph.service';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import * as fs from 'fs/promises';

async function main() {
  const llm = {} as BaseChatModel;

  const graph = new LanggraphService(llm, llm, llm, {} as any, {} as any).build();

  const drawableGraph = await graph.getGraphAsync();
  const image = await drawableGraph.drawMermaidPng();
  const imageBuffer = new Uint8Array(await image.arrayBuffer());

  await fs.writeFile('../assets/graph.png', imageBuffer);
}

main().catch((error) => {
  console.error('Failed to export LangGraph graph:', error);
  process.exitCode = 1;
});
