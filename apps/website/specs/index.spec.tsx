jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../src/app/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

import { render, screen } from '@testing-library/react';
import Page from '../src/app/page';
import { ThemePreferenceProvider } from '../src/app/context/theme-preference-context';
import { JobProcessingRunProvider } from '../src/app/context/job-processing-run-context';

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe('Page', () => {
  it('should render successfully', async () => {
    render(
      <JobProcessingRunProvider>
        <ThemePreferenceProvider>
          <Page />
        </ThemePreferenceProvider>
      </JobProcessingRunProvider>,
    );

    expect(await screen.findByText('Signed in')).toBeTruthy();
  });
});
