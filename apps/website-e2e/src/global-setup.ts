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

export default async function globalSetup() {
  console.log('Setting up e2e test infrastructure...');

  execSync(
    'docker compose -f deployment/docker-compose.yml -f deployment/docker-compose.dev.yml --env-file .env --profile infrastructure --profile tools-reset up -d',
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
    },
  );

  await waitForPort('localhost', 5432, 120_000);
  await waitForPort('localhost', 5672, 120_000);

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

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list Supabase users: ${listError.message}`);
  }

  const existingUser = listData.users.find(
    (user) => user.email === testUserEmail,
  );

  if (!existingUser) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
    });

    if (createError) {
      throw new Error(`Failed to create test user: ${createError.message}`);
    }

    console.log(`Created test user: ${testUserEmail}`);
  } else {
    console.log(`Test user already exists: ${testUserEmail}`);
  }

  process.env.E2E_TEST_USER_EMAIL = testUserEmail;
  process.env.E2E_TEST_USER_PASSWORD = testUserPassword;

  console.log('E2e infrastructure is ready.');
}
