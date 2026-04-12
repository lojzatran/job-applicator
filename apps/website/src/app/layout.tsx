import './global.css';
import { ThemePreferenceProvider } from './context/theme-preference-context';
import { JobProcessingRunProvider } from './context/job-processing-run-context';

export const metadata = {
  title: 'Job Applicator AI | Automate Your Job Search',
  description:
    'Apply to jobs with AI-powered cover letters and personalized matching.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemePreferenceProvider>
          <JobProcessingRunProvider>{children}</JobProcessingRunProvider>
        </ThemePreferenceProvider>
      </body>
    </html>
  );
}
