import { execSync } from 'child_process';
import { createConnection } from 'net';
import { workspaceRoot } from '@nx/devkit';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

function waitForPort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const startTime = Date.now();
  let timer: NodeJS.Timeout | null = null;
  let socket: ReturnType<typeof createConnection> | null = null;
  let resolved = false;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      resolved = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (socket) {
        socket.removeAllListeners();
        socket.destroy();
        socket = null;
      }
    };

    const tryConnect = () => {
      if (resolved) return;

      if (Date.now() - startTime > timeoutMs) {
        cleanup();
        reject(new Error(`Timed out waiting for ${host}:${port}`));
        return;
      }

      socket = createConnection(port, host);
      socket.on('connect', () => {
        cleanup();
        resolve();
      });
      socket.on('error', () => {
        if (socket) {
          socket.removeAllListeners();
          socket.destroy();
          socket = null;
        }
        if (!resolved) {
          timer = setTimeout(tryConnect, 1000);
        }
      });
    };

    tryConnect();
  });
}

function waitForDbReset(cwd: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Timed out waiting for db-reset to complete'));
        return;
      }

      try {
        const psOutput = execSync(
          'docker compose -f deployment/docker-compose.yml -f deployment/docker-compose.dev.yml --env-file .env ps --all --format "{{.Service}}\t{{.ID}}"',
          {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
          },
        ).trim();

        const lines = psOutput.split('\n').filter((line) => line.length > 0);
        const dbResetLine = lines.find((line) => line.startsWith('db-reset\t'));

        if (!dbResetLine) {
          setTimeout(check, 1000);
          return;
        }

        const containerId = dbResetLine.split('\t')[1];

        const status = execSync(
          `docker inspect -f '{{.State.Status}}' ${containerId}`,
          {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
          },
        ).trim();

        if (status === 'exited') {
          const exitCode = execSync(
            `docker inspect -f '{{.State.ExitCode}}' ${containerId}`,
            {
              cwd,
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'ignore'],
            },
          ).trim();

          if (exitCode === '0') {
            resolve();
          } else {
            reject(new Error(`db-reset failed with exit code ${exitCode}`));
          }
          return;
        }

        setTimeout(check, 1000);
      } catch {
        setTimeout(check, 1000);
      }
    };

    check();
  });
}

async function setupSupabaseTestUser(): Promise<void> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!supabaseSecretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not set. Please add it to your .env file.',
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testUserEmail = 'e2e-test@example.com';
  const testUserPassword = 'e2e-test-password-123';

  const { error: createError } = await supabase.auth.admin.createUser({
    email: testUserEmail,
    password: testUserPassword,
    email_confirm: true,
  });

  if (createError) {
    const isDuplicateEmail =
      createError.status === 422 ||
      createError.code === 'email_exists' ||
      createError.code === 'user_already_exists';

    if (!isDuplicateEmail) {
      throw new Error(`Failed to create test user: ${createError.message}`);
    }

    console.log(`Test user already exists: ${testUserEmail}`);
  } else {
    console.log(`Created test user: ${testUserEmail}`);
  }

  process.env.E2E_TEST_USER_EMAIL = testUserEmail;
  process.env.E2E_TEST_USER_PASSWORD = testUserPassword;
}

export default async function globalSetup() {
  console.log('Setting up e2e test infrastructure...');

  // --build ensures db-reset runs migrations from the current checkout
  // instead of a stale published image.
  execSync(
    'docker compose -f deployment/docker-compose.yml -f deployment/docker-compose.dev.yml --env-file .env --profile infrastructure --profile tools-reset up -d --build',
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
    },
  );

  await Promise.all([
    (async () => {
      await waitForDbReset(workspaceRoot, 120_000);
      await waitForPort('localhost', 5432, 120_000);
      await waitForPort('localhost', 5672, 120_000);
    })(),
    setupSupabaseTestUser(),
  ]);

  console.log('E2e infrastructure is ready.');
}
