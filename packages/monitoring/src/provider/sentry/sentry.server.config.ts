import * as Sentry from '@sentry/nextjs';

import { keys } from '../../../keys';

type Parameters<T extends (args: never) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

export function initializeSentryServerClient(
  props: Parameters<typeof Sentry.init>[0] = {}
) {
  return Sentry.init({
    dsn: keys().NEXT_PUBLIC_MONITORING_SENTRY_DSN,
    tracesSampleRate: props?.tracesSampleRate ?? 1.0,
    ...props
  });
}
