import { keys } from '../../../keys';
import type { AnalyticsProvider } from '../types';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

type GtagCommand = 'config' | 'event' | 'set' | 'js' | 'consent';
let isInitialized = false;

function gtag(command: GtagCommand, ...args: unknown[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push([command, ...args]);
}

function setLocalHostTrackingDisabled(measurementId: string): void {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    // @ts-expect-error: This is a custom property
    window['ga-disable-' + measurementId] = true;
  }
}

function createGtagScript(measurementId: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      isInitialized = true;

      gtag('config', measurementId, {
        send_page_view: false
      });

      gtag('js', new Date());
      resolve();
    };
  });
}

async function initialize(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') {
    return Promise.resolve();
  }

  const measurementId = keys().NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID;
  if (!measurementId) {
    throw new Error(
      'Measurement ID is not set. Please set the environment variable NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID.'
    );
  }

  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }

  if (keys().NEXT_PUBLIC_ANALYTICS_GA_DISABLE_LOCALHOST_TRACKING) {
    setLocalHostTrackingDisabled(measurementId);
  }

  return createGtagScript(measurementId);
}

export default {
  trackPageView: async (path: string): Promise<void> => {
    if (typeof window === 'undefined') {
      return;
    }

    if (keys().NEXT_PUBLIC_ANALYTICS_GA_DISABLE_PAGE_VIEWS_TRACKING) {
      return;
    }

    if (!isInitialized) {
      await initialize();
    }

    const measurementId = keys().NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID;
    if (!measurementId) {
      return;
    }

    const newUrl = new URL(path, window.location.href).href;

    gtag('config', measurementId, {
      send_page_view: false,
      page_location: newUrl,
      update: true
    });

    gtag('event', 'page_view');
  },

  trackEvent: async (
    eventName: string,
    eventProperties: Record<string, string | string[]> = {}
  ): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    const processedProperties: Record<string, string> = {};
    Object.entries(eventProperties).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        processedProperties[key] = value.join(',');
      } else {
        processedProperties[key] = value;
      }
    });

    gtag('event', eventName, processedProperties);
  },

  identify: async (
    userId: string,
    traits: Record<string, string> = {}
  ): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    const measurementId = keys().NEXT_PUBLIC_ANALYTICS_GA_MEASUREMENT_ID;
    if (!measurementId) {
      return;
    }

    gtag('config', measurementId, {
      user_id: userId,
      ...traits
    });
  }
} satisfies AnalyticsProvider;
