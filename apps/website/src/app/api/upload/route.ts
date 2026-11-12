import amqplib from 'amqplib';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { failPendingJobApplicationProcessingRun } from '../../lib/db/processing-run.repository';
import {
  ProcessingRunLimitError,
  reserveJobApplicationProcessingRun,
} from '../../lib/services/processing-run.service';
import { env } from '../../utils/env';
import { withAuth } from '../../lib/auth/with-auth';
import { NextResponse } from 'next/server';
import type { JobApplicationProcessingRun } from '@apps/shared';

export const runtime = 'nodejs';
// Removed unused logger

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
  userId,
}: {
  filePath: string;
  linkedinEnabled: boolean;
  startupJobsEnabled: boolean;
  maxJobs: number;
  threadId: string;
  userId: string;
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
          userId,
        }),
      ),
      { persistent: false },
    );

    await channel.waitForConfirms();
  } finally {
    await connection.close();
  }
};

export const POST = withAuth(async (request, ctx) => {
  const userId = ctx.user.id;

  const formData = await request.formData();
  const fileEntry = formData.get('file');
  const linkedinEnabled = toBoolean(formData.get('linkedinEnabled'));
  const startupJobsEnabled = toBoolean(formData.get('startupJobsEnabled'));
  const maxJobs = toPositiveInteger(formData.get('maxJobs'), 10);

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ message: 'File is required.' }, { status: 400 });
  }

  if (extname(fileEntry.name).toLowerCase() !== '.pdf') {
    return NextResponse.json(
      { message: 'Upload a PDF resume.' },
      { status: 400 },
    );
  }

  const threadId = uuidv4();
  let jobProcessingRun: JobApplicationProcessingRun;

  try {
    jobProcessingRun = await reserveJobApplicationProcessingRun({
      threadId,
      userId,
    });
  } catch (error) {
    if (error instanceof ProcessingRunLimitError) {
      return NextResponse.json(
        {
          message: error.message,
          code:
            error.status === 429
              ? 'processing_rate_limited'
              : 'processing_run_active',
        },
        {
          status: error.status,
          headers: error.retryAfterSeconds
            ? { 'Retry-After': String(error.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    throw error;
  }

  let filePath: string | undefined;

  try {
    await mkdir(env.STORAGE_DIR, { recursive: true });
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const storedName = createStoredFilename(fileEntry.name);
    filePath = join(env.STORAGE_DIR, storedName);
    await writeFile(filePath, buffer);

    await sendToQueue({
      filePath,
      linkedinEnabled,
      startupJobsEnabled,
      maxJobs,
      threadId,
      userId,
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
    await Promise.all([
      filePath ? rm(filePath, { force: true }) : undefined,
      failPendingJobApplicationProcessingRun(threadId, userId),
    ]);
    throw error;
  }
}, 'upload');
