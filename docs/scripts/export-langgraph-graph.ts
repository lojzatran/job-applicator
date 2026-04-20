import { LanggraphService } from '../../apps/api/src/app/ai/langgraph/langgraph.service';
import type { CvEmbeddingsService } from '../../apps/api/src/app/cv/embeddings/cv-summary-embeddings.service';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '@apps/shared';

const logger = createLogger('export-langgraph-graph');

async function main() {
  const llm = {} as BaseChatModel;

  const cvEmbeddingsService = {} as unknown as CvEmbeddingsService;

  const graph = new LanggraphService(
    llm,
    llm,
    llm,
    cvEmbeddingsService,
  ).build();

  const drawableGraph = await graph.getGraphAsync();
  const image = await drawableGraph.drawMermaidPng();
  const imageBuffer = new Uint8Array(await image.arrayBuffer());

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  await fs.writeFile(path.join(__dirname, '../assets/graph.png'), imageBuffer);
}

main().catch((error) => {
  logger.error(error, 'Failed to export LangGraph graph');
  process.exitCode = 1;
});
