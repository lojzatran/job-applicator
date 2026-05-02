import pino, { Logger } from 'pino';
import { env } from '../utils/env';

const REDACT_PATHS = [
  'authorization',
  '*.authorization',
  'headers.authorization',
  'req.headers.authorization',
  'request.headers.authorization',
  'password',
  '*.password',
  'pwd',
  '*.pwd',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'apiKey',
  '*.apiKey',
  'GOOGLE_API_KEY',
  'SUPABASE_API_KEY',
];

function getTransport() {
  const isDev = env.NODE_ENV === 'development';
  // this is false when running in docker
  // as pino-pretty is devDependency and docker uses npm ci --omit=dev
  const isTerminalStdout =
    typeof process !== 'undefined' && Boolean(process.stdout?.isTTY);

  if (!isDev) {
    return undefined;
  }

  const logDir = env.LOGS_DIR;
  const targets: pino.TransportTargetOptions[] = [
    {
      level: 'debug',
      target: 'pino/file',
      options: {
        destination: `${logDir}/app-json.log`,
        mkdir: true,
      },
    },
  ];

  if (isTerminalStdout) {
    targets.push({
      level: 'debug',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname',
      },
    });
  } else {
    targets.push({
      level: 'debug',
      target: 'pino/file',
      options: {
        destination: 1,
      },
    });
  }

  return pino.transport({ targets });
}

export function createLogger(name: string): Logger {
  return pino(
    {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      name,
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: {
        err: pino.stdSerializers.err,
      },
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
      },
    },
    getTransport(),
  );
}
