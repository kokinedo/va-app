import type { AnalyticsProvider } from '../types';

function noop(operation: string): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    console.debug(
      `[Console Analytics] Called '${operation}' with args:`,
      ...args.filter(Boolean)
    );
  };
}

export default {
  trackPageView: noop('trackPageView'),
  trackEvent: noop('trackEvent'),
  identify: noop('identify')
} satisfies AnalyticsProvider;
