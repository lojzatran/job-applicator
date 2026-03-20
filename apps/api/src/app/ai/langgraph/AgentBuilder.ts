import {
  MessagesAnnotation,
  StateGraph,
  BaseCheckpointSaver,
  END,
  START,
  MessagesValue,
} from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StateSchema } from '@langchain/langgraph';

export class AgentBuilder {
  constructor(
    private checkpointer: BaseCheckpointSaver,
    private llm: BaseChatModel,
  ) {}

  private fetchJobs() {
    const jobFetchersGraph = new StateGraph(MessagesAnnotation);
    return jobFetchersGraph.compile();
  }

  private callModel() {}

  build() {
    const State = new StateSchema({
      messages: MessagesValue,
    });

    const stateGraph = new StateGraph(State);

    stateGraph
      .addNode('job_filter', jobFilter)
      .addNode('job_evaluator', jobEvaluator)
      .addNode('cover_letter_generator', coverLetterGenerator)
      .addEdge(START, 'job_fetchers')
      .addEdge('job_fetchers', 'job_filter')
      .addEdge('job_filter', 'job_evaluator')
      .addEdge('job_evaluator', 'cover_letter_generator')
      .addEdge('cover_letter_generator', END);

    return stateGraph.compile({
      checkpointer: this.checkpointer,
    });
  }
}
