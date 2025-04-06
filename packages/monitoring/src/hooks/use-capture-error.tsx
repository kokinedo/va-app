'use client';

import * as React from 'react';

import { useMonitoring } from './use-monitoring';

export function useCaptureError<Extra extends object>(
  error: unknown,
  extra?: Extra
): void {
  const provider = useMonitoring();

  React.useEffect(() => {
    void provider.captureError(error, extra);
  }, [error, provider]);
}
