'use client';

import * as React from 'react';

import { MonitoringProvider as MonitoringProviderImpl } from '../provider';
import type { MonitoringProvider as MonitoringProviderInterface } from '../provider/types';

export const MonitoringContext =
  React.createContext<MonitoringProviderInterface>(MonitoringProviderImpl);

export function MonitoringProvider(
  props: React.PropsWithChildren
): React.JSX.Element {
  return (
    <MonitoringContext.Provider value={MonitoringProviderImpl}>
      {props.children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring(): MonitoringProviderInterface {
  return React.useContext(MonitoringContext);
}
