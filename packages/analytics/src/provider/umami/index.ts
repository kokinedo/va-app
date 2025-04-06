import { keys } from '../../../keys';
import type { AnalyticsProvider } from '../types';

declare global {
  interface Window {
    umami: {
      track: (
        event: string | Record<string, string>,
        properties?: Record<string, string>
      ) => void;
    };
  }
}

let isInitialized = false;
let currentUserId: string | undefined;

function getUmami() {
  return typeof window === 'undefined' || !window.umami
    ? {
        track: () => {
          // Do nothing
        }
      }
    : window.umami;
}

function disableLocalhostTracking(): void {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      localStorage.setItem('umami.disabled', '1');
    }
  }
}

function createUmamiScript(host: string, websiteId: string): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  const script = document.createElement('script');
  script.src = host;
  script.async = true;
  script.defer = true;

  script.setAttribute('data-website-id', websiteId);
  document.head.appendChild(script);

  return new Promise<void>((resolve) => {
    script.onload = () => {
      resolve();
    };
  });
}

async function initialize(): Promise<void> {
  if (isInitialized) {
    return Promise.resolve();
  }

  const host = keys().NEXT_PUBLIC_ANALYTICS_UMAMI_HOST;
  if (!host) {
    throw new Error(
      'Host is not set. Please set the environment variable NEXT_PUBLIC_ANALYTICS_UMAMI_HOST.'
    );
  }

  const websiteId = keys().NEXT_PUBLIC_ANALYTICS_UMAMI_WEBSITE_ID;
  if (!websiteId) {
    throw new Error(
      'Website ID is not set. Please set the environment variable NEXT_PUBLIC_ANALYTICS_UMAMI_WEBSITE_ID.'
    );
  }

  if (keys().NEXT_PUBLIC_ANALYTICS_UMAMI_DISABLE_LOCALHOST_TRACKING) {
    disableLocalhostTracking();
  }

  await createUmamiScript(host, websiteId);
  isInitialized = true;
}

export default {
  trackPageView: async (): Promise<void> => {
    // Umami tracks page views automatically
    return Promise.resolve();
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

    if (currentUserId) {
      processedProperties.user_id = currentUserId;
    }

    getUmami().track(eventName, processedProperties);
  },

  identify: async (userId: string): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    currentUserId = userId;
  }
} satisfies AnalyticsProvider;
