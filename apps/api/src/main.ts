/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Transport } from '@nestjs/microservices';
import { env } from './utils/env';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [env.RABBITMQ_URL],
      queue: env.RABBITMQ_QUEUE_PROCESS,
      queueOptions: {
        durable: false,
      },
      noAck: false,
    },
  });
  app.enableShutdownHooks();
  await app.listen();
}

bootstrap();
