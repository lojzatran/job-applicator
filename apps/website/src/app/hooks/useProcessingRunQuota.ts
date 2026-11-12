'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProcessingRunQuota } from '../types/processing-run-quota';

export const useProcessingRunQuota = () => {
  const [quota, setQuota] = useState<ProcessingRunQuota | null>(null);
  const [error, setError] = useState('');
  const requestController = useRef<AbortController | null>(null);

  const refreshQuota = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setError('');

    try {
      const response = await fetch('/api/runs/quota', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Unable to load run allowance.');

      const nextQuota: ProcessingRunQuota = await response.json();
      if (!controller.signal.aborted) setQuota(nextQuota);
    } catch {
      if (!controller.signal.aborted) {
        setQuota(null);
        setError('Unable to load run allowance.');
      }
    }
  }, []);

  useEffect(() => {
    const refreshOnFocus = () => void refreshQuota();
    refreshOnFocus();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      requestController.current?.abort();
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [refreshQuota]);

  useEffect(() => {
    if (!quota?.nextAvailableAt) return;

    const timer = setTimeout(
      () => void refreshQuota(),
      Math.max(1000, Date.parse(quota.nextAvailableAt) - Date.now() + 100),
    );
    return () => clearTimeout(timer);
  }, [quota?.nextAvailableAt, refreshQuota]);

  return { quota, quotaError: error, refreshQuota };
};
