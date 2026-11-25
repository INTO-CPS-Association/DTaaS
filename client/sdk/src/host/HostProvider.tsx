import { createContext, type ReactNode, useContext } from 'react';
import type { HostServices } from './hostServices.types';

const HostContext = createContext<HostServices | null>(null);

export interface HostProviderProps {
  readonly services: HostServices;
  readonly children: ReactNode;
}

/** Makes one extension's host services available to its components. */
export function HostProvider({ services, children }: HostProviderProps) {
  return (
    <HostContext.Provider value={services}>{children}</HostContext.Provider>
  );
}

/** The host services of the extension whose component is rendering. */
export const useHost = (): HostServices => {
  const services = useContext(HostContext);
  if (services === null) {
    throw new Error('useHost() must be used inside <HostProvider>');
  }
  return services;
};
