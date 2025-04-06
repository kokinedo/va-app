import type { ErrorContext, ErrorRequest, MonitoringProvider } from '../types';

export default {
  withConfig<C>(nextConfig: C): C {
    return nextConfig;
  },

  async register(): Promise<void> {
    console.info(`[Console Monitoring] Registered.`);
  },

  captureRequestError(
    error: unknown,
    errorRequest: Readonly<ErrorRequest>,
    errorContext: Readonly<ErrorContext>
  ): void {
    console.info('[Console Monitoring] Request error occurred.');

    // Log error details if available
    this.captureError(error);

    // Log request details if available
    if (errorRequest) {
      console.info('[Console Monitoring] Request Details:', {
        path: errorRequest.path,
        method: errorRequest.method,
        headers: errorRequest.headers
      });
    }

    // Log context details if available
    if (errorContext) {
      console.info('[Console Monitoring] Context Details:', {
        routerKind: errorContext.routerKind,
        routePath: errorContext.routePath,
        routeType: errorContext.routeType,
        renderSource: errorContext.renderSource || 'N/A',
        revalidateReason: errorContext.revalidateReason ?? 'N/A'
      });
    }
  },

  captureError<Extra extends object>(error: unknown, extra?: Extra): void {
    if (error instanceof Error) {
      console.error('[Console Monitoring] Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        extra
      });
    } else if (typeof error === 'string') {
      console.error('[Console Monitoring] Error:', error, extra);
    } else if (error) {
      console.error(
        '[Console Monitoring] Unknown error:',
        JSON.stringify(error),
        extra
      );
    }
  },

  captureEvent<Extra extends object>(event: string, extra?: Extra): void {
    console.info(`[Console Monitoring] Event captured:`, { event, extra });
  },

  setUser<Info extends { id: string }>(user: Info): void {
    console.info(`[Console Monitoring] User tracked:`, user);
  }
} satisfies MonitoringProvider;
