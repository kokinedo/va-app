import * as Sentry from '@sentry/nextjs';

import { keys } from '../../../keys';
import type { ErrorContext, ErrorRequest, MonitoringProvider } from '../types';

export default {
  withConfig<C>(nextConfig: C): C {
    return Sentry.withSentryConfig(nextConfig, {
      org: keys().MONITORING_SENTRY_ORG,
      project: keys().MONITORING_SENTRY_PROJECT,
      authToken: keys().MONITORING_SENTRY_AUTH_TOKEN, // Required for uploading source maps
      silent: process.env.NODE_ENV !== 'production', // Suppressing sdk build logs
      autoInstrumentServerFunctions: false,
      widenClientFileUpload: true,
      telemetry: false
    });
  },

  async register(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const { initializeSentryBrowserClient } = await import(
          './sentry.client.config'
        );
        initializeSentryBrowserClient();
      } else {
        if (process.env.NEXT_RUNTIME === 'edge') {
          const { initializeSentryEdgeClient } = await import(
            './sentry.edge.config'
          );
          initializeSentryEdgeClient();
        } else {
          const { initializeSentryServerClient } = await import(
            './sentry.server.config'
          );
          initializeSentryServerClient();
        }
      }
    } catch (error) {
      console.error('[Sentry Monitoring] Registration failed:', error);
    }
  },

  async captureRequestError(
    error: unknown,
    errorRequest: Readonly<ErrorRequest>,
    errorContext: Readonly<ErrorContext>
  ): Promise<void> {
    return Sentry.captureRequestError(error, errorRequest, errorContext);
  },

  captureError(error: unknown): string {
    return Sentry.captureException(error);
  },

  captureEvent<Extra extends Sentry.Event>(
    event: string,
    extra?: Extra
  ): string {
    return Sentry.captureEvent({
      message: event,
      ...(extra ?? {})
    });
  },

  setUser<Info extends { id: string }>(user: Info): void {
    Sentry.setUser(user);
  }
} satisfies MonitoringProvider;
