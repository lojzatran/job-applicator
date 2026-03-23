import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs/jobs.service';
import { PdfService } from './documents/pdf/pdf.service';
import { AgentService } from './ai/langgraph/agent.service';
import { EventPattern, Payload, RmqContext, Ctx } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly pdfService: PdfService,
    private readonly agentService: AgentService,
  ) {}

  @EventPattern()
  async getData(
    @Ctx() context: RmqContext,
    @Payload() { filePath, linkedinEnabled }: { filePath: string; linkedinEnabled: boolean },
  ) {
    console.log('Processing job applications...');
    const channelRef = context.getChannelRef();
    try {
      const jobs = await this.jobsService.fetchJobs(linkedinEnabled);
      const text = await this.pdfService.extractTextContent(filePath);
      await this.agentService.executeAgent([jobs[0]], text);
      channelRef.ack(context.getMessage());
    } catch (e) {
      channelRef.nack(context.getMessage());
    }
  }
}
