import { Controller } from '@nestjs/common';
import { AgentService } from './ai/langgraph/agent.service';
import { EventPattern, Payload, RmqContext, Ctx } from '@nestjs/microservices';
import { createLogger } from '@apps/shared';

@Controller()
export class AppController {
  private readonly logger = createLogger('app-controller');

  constructor(private readonly agentService: AgentService) {}

  @EventPattern()
  async getData(
    @Ctx() context: RmqContext,
    @Payload()
    {
      filePath,
      linkedinEnabled,
      startupJobsEnabled,
      maxJobs,
      threadId,
    }: {
      filePath: string;
      linkedinEnabled: boolean;
      startupJobsEnabled: boolean;
      maxJobs: number;
      threadId: string;
    },
  ) {
    this.logger.info('Processing job applications...');
    const channelRef = context.getChannelRef();
    try {
      await this.agentService.executeAgent(filePath, {
        maxJobs,
        linkedinEnabled,
        startupJobsEnabled,
        threadId,
      });
      channelRef.ack(context.getMessage());
    } catch (e) {
      this.logger.error(e, 'Error processing job applications');
      channelRef.nack(context.getMessage());
    }
  }
}
