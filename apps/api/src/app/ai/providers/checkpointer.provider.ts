import { CHECKPOINTER } from '../ai.constants';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { env } from '../../../utils/env';

const databaseUrl = new URL(
  `postgres://${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
);
databaseUrl.username = env.POSTGRES_USER;
databaseUrl.password = env.POSTGRES_PASSWORD;

async function getPostgresCheckpointer(): Promise<BaseCheckpointSaver> {
  const checkpointer = PostgresSaver.fromConnString(databaseUrl.toString(), {
    schema: 'public',
  });

  await checkpointer.setup();

  return checkpointer;
}

export const checkpointerProvider = {
  provide: CHECKPOINTER,
  useFactory: () => {
    return getPostgresCheckpointer();
  },
};
