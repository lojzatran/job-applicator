import { render } from '@testing-library/react';
import Page from '../src/app/page';
import { ThemePreferenceProvider } from '../src/app/context/theme-preference-context';
import { JobProcessingRunProvider } from '../src/app/context/job-processing-run-context';

beforeEach(() => {
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
  it('should render successfully', () => {
    const { baseElement } = render(
      <JobProcessingRunProvider>
        <ThemePreferenceProvider>
          <Page />
        </ThemePreferenceProvider>
      </JobProcessingRunProvider>,
    );
    expect(baseElement).toBeTruthy();
  });
});
