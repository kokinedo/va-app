import type { PostHog as ClientPostHog } from 'posthog-js';
import type { PostHog as ServerPostHog } from 'posthog-node';

import { keys } from '../../../keys';
import type { AnalyticsProvider } from '../types';

let clientPostHog: ClientPostHog | undefined;
let serverPostHog: ServerPostHog | undefined;
let userId: string | undefined;
let isInitialized = false;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

async function initializeOrGetServerPostHog(): Promise<ServerPostHog> {
  if (!serverPostHog) {
    const { PostHog } = await import('posthog-node');

    const posthogHost = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST!;
    const posthogKey = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY!;

    serverPostHog = new PostHog(posthogKey, {
      host: posthogHost,
      flushAt: 1,
      flushInterval: 0
    });
  }

  return serverPostHog;
}

async function initializeOrGetClientPostHog(): Promise<ClientPostHog> {
  if (!clientPostHog) {
    const { posthog } = await import('posthog-js');

    const posthogKey = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY!;
    const posthogHost = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST!;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      ui_host: posthogHost,
      persistence: 'localStorage+cookie',
      person_profiles: 'always',
      capture_pageview: false,
      capture_pageleave: true
    });

    clientPostHog = posthog;
  }

  return clientPostHog;
}

async function initialize(): Promise<void> {
  const posthogKey = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_KEY!;
  if (!posthogKey) {
    throw new Error('PostHog key not provided, skipping initialization');
  }

  const posthogHost = keys().NEXT_PUBLIC_ANALYTICS_POSTHOG_HOST;
  if (!posthogHost) {
    throw new Error('PostHog host not provided, skipping initialization');
  }

  if (isClient()) {
    initializeOrGetClientPostHog();
  } else {
    initializeOrGetServerPostHog();
  }
  isInitialized = true;
}

export default {
  identify: async (
    userIdentifier: string,
    traits?: Record<string, string>
  ): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    userId = userIdentifier;

    if (isClient()) {
      const clientPostHog = await initializeOrGetClientPostHog();
      clientPostHog.identify(userIdentifier, traits);
    } else {
      const serverPostHog = await initializeOrGetServerPostHog();
      serverPostHog.capture({
        event: '$identify',
        distinctId: userIdentifier,
        properties: traits
      });
    }
  },

  trackPageView: async (url: string): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    if (isClient()) {
      const clientPostHog = await initializeOrGetClientPostHog();
      clientPostHog.capture('$pageview', { $current_url: url });
    } else {
      if (!userId) {
        throw new Error(
          `Please identify the user using the identify method before tracking page views`
        );
      }

      const serverPostHog = await initializeOrGetServerPostHog();
      serverPostHog.capture({
        event: '$pageview',
        distinctId: userId,
        properties: { $current_url: url }
      });
    }
  },

  trackEvent: async (
    eventName: string,
    eventProperties?: Record<string, string | string[]>
  ): Promise<void> => {
    if (!isInitialized) {
      await initialize();
    }

    if (isClient()) {
      const clientPostHog = await initializeOrGetClientPostHog();
      clientPostHog.capture(eventName, eventProperties);
    } else {
      if (!userId) {
        throw new Error(
          `Please identify the user using the identify method before tracking events`
        );
      }

      const serverPostHog = await initializeOrGetServerPostHog();
      serverPostHog.capture({
        event: eventName,
        distinctId: userId,
        properties: eventProperties
      });

      await serverPostHog.shutdown();
    }
  }
} satisfies AnalyticsProvider;
