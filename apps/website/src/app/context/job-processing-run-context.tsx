'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { JobApplicationProcessingRun } from '../types/job-processing-run';

interface JobProcessingRunContextValue {
  jobProcessingRun: JobApplicationProcessingRun | null;
  setJobProcessingRun: (
    jobProcessingRun: JobApplicationProcessingRun | null,
  ) => void;
}

const JobProcessingRunContext =
  createContext<JobProcessingRunContextValue | null>(null);

export const JobProcessingRunProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [jobProcessingRun, setJobProcessingRunState] =
    useState<JobApplicationProcessingRun | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('jobProcessingRun');
      if (stored) {
        setJobProcessingRunState(JSON.parse(stored));
      }
    } catch (error) {
      console.error(
        'Failed to parse jobProcessingRun from localStorage',
        error,
      );
    }
  }, []);

  const setJobProcessingRun = useCallback(
    (run: JobApplicationProcessingRun | null) => {
      setJobProcessingRunState(run);
      try {
        if (run) {
          localStorage.setItem('jobProcessingRun', JSON.stringify(run));
        } else {
          localStorage.removeItem('jobProcessingRun');
        }
      } catch (error) {
        console.error('Failed to save jobProcessingRun to localStorage', error);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: NodeJS.Timeout;

    if (jobProcessingRun) {
      timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/runs/${jobProcessingRun.threadId}`, {
            signal: controller.signal,
          });

          if (!res.ok) throw new Error('Request failed');

          const json = await res.json();
          if (json.status === 'completed' || json.status === 'failed') {
            setJobProcessingRun(null);
          } else {
            setJobProcessingRun(json);
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error(error);
            setJobProcessingRun(null);
          }
        }
      }, 1000);
    }

    return () => {
      if (jobProcessingRun) {
        clearTimeout(timer);
        controller.abort();
      }
    };
  }, [jobProcessingRun, setJobProcessingRun]);

  return (
    <JobProcessingRunContext.Provider
      value={{
        jobProcessingRun,
        setJobProcessingRun,
      }}
    >
      {children}
    </JobProcessingRunContext.Provider>
  );
};

export const useJobProcessingRunContext = () => {
  const context = useContext(JobProcessingRunContext);

  if (!context) {
    throw new Error(
      'useJobProcessingRunContext must be used within JobProcessingRunProvider',
    );
  }

  return context;
};
