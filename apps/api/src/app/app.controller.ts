import { Controller } from '@nestjs/common';
import { AgentService } from './ai/langgraph/agent.service';
import { EventPattern, Payload, RmqContext, Ctx } from '@nestjs/microservices';

@Controller()
export class AppController {
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
    console.log('Processing job applications...');
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
      console.log(
        'Error processing job applications:',
        JSON.stringify(e, null, 2),
      );
      channelRef.nack(context.getMessage());
    }
  }
}
