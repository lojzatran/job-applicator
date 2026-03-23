import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { NextResponse } from 'next/server';
import amqplib from 'amqplib';

export const runtime = 'nodejs';

const uploadsDirectory = resolve(process.cwd(), '..', '..', 'uploads');

const toBoolean = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
};

const createStoredFilename = (originalName: string): string => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${uniqueSuffix}${extname(originalName)}`;
};

const sendToQueue = async ({
  filePath,
  linkedinEnabled,
}: {
  filePath: string;
  linkedinEnabled: boolean;
}) => {
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (!rabbitmqUrl) {
    throw new Error('RABBITMQ_URL is not defined');
  }
  const connection = await amqplib.connect(rabbitmqUrl);
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue('process_job_applications', { durable: false });

  channel.sendToQueue(
    'process_job_applications',
    Buffer.from(
      JSON.stringify({
        filePath,
        linkedinEnabled,
      }),
    ),
    { persistent: false },
  );

  await channel.waitForConfirms();
  await connection.close();
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const fileEntry = formData.get('file');

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ message: 'File is required.' }, { status: 400 });
  }

  await mkdir(uploadsDirectory, { recursive: true });

  const storedName = createStoredFilename(fileEntry.name);
  const filePath = join(uploadsDirectory, storedName);
  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  await writeFile(filePath, buffer);

  await sendToQueue({
    filePath,
    linkedinEnabled: toBoolean(formData.get('linkedinEnabled')),
  });

  return NextResponse.json({
    message: 'File uploaded successfully.',
    linkedinEnabled: toBoolean(formData.get('linkedinEnabled')),
    file: {
      originalName: fileEntry.name,
      storedName,
      path: filePath,
      mimeType: fileEntry.type,
      size: fileEntry.size,
    },
  });
}
