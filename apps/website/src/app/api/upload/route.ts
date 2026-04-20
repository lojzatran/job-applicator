import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { NextResponse } from 'next/server';
import amqplib from 'amqplib';
import { env } from '../../utils/env';
import { v4 as uuidv4 } from 'uuid';
import { saveJobApplicationProcessingRun } from '../../lib/db/db-client';

export const runtime = 'nodejs';

const toBoolean = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
};

const toPositiveInteger = (
  value: FormDataEntryValue | null,
  fallback: number,
): number => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
};

const createStoredFilename = (originalName: string): string => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${uniqueSuffix}${extname(originalName)}`;
};

const sendToQueue = async ({
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
}) => {
  const connection = await amqplib.connect(env.RABBITMQ_URL);
  try {
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(env.RABBITMQ_QUEUE_PROCESS, { durable: false });

    channel.sendToQueue(
      env.RABBITMQ_QUEUE_PROCESS,
      Buffer.from(
        JSON.stringify({
          filePath,
          linkedinEnabled,
          startupJobsEnabled,
          maxJobs,
          threadId,
        }),
      ),
      { persistent: false },
    );

    await channel.waitForConfirms();
  } finally {
    await connection.close();
  }
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const fileEntry = formData.get('file');
  const linkedinEnabled = toBoolean(formData.get('linkedinEnabled'));
  const startupJobsEnabled = toBoolean(formData.get('startupJobsEnabled'));
  const maxJobs = toPositiveInteger(formData.get('maxJobs'), 10);

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ message: 'File is required.' }, { status: 400 });
  }

  await mkdir(env.STORAGE_DIR, { recursive: true });

  const storedName = createStoredFilename(fileEntry.name);
  const filePath = join(env.STORAGE_DIR, storedName);
  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  await writeFile(filePath, buffer);

  try {
    const threadId = uuidv4();

    const jobProcessingRun = await saveJobApplicationProcessingRun({
      threadId,
    });

    await sendToQueue({
      filePath,
      linkedinEnabled,
      startupJobsEnabled,
      maxJobs,
      threadId,
    });

    return NextResponse.json({
      message: 'File uploaded successfully.',
      linkedinEnabled,
      startupJobsEnabled,
      maxJobs,
      file: {
        originalName: fileEntry.name,
        storedName,
        path: filePath,
        mimeType: fileEntry.type,
        size: fileEntry.size,
      },
      jobProcessingRun,
    });
  } catch (error) {
    await rm(filePath, { force: true });
    throw error;
  }
}
