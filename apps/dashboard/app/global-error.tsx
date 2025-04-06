'use client';

import * as React from 'react';
import NextError from 'next/error';

import { useCaptureError } from '@workspace/monitoring/hooks/use-capture-error';

export type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({
  error: { digest, ...error }
}: GlobalErrorProps): React.JSX.Element {
  useCaptureError(error, { digest });
  return (
    <html>
      <body>
        {/* This is the default Next.js error component but it doesn't allow omitting the statusCode property yet. */}
        <NextError statusCode={undefined as never} />
      </body>
    </html>
  );
}
