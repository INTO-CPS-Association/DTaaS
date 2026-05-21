import type { EnvironmentState } from 'model/store/environment.slice';

type StoreReader = { getState: () => { environment: EnvironmentState } };

let _store: StoreReader | null = null;

export function setEnvironmentStore(store: StoreReader): void {
  _store = store;
}

export function resetEnvironmentStore(): void {
  _store = null;
}

export default function getAuthority(): string {
  if (!_store) {
    throw new Error(
      'Environment store not initialized. Call setEnvironmentStore() first.',
    );
  }
  return _store.getState().environment.AUTH_AUTHORITY;
}
