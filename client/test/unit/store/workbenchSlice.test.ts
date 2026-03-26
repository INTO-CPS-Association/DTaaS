import workbenchReducer, {
  setWorkbenchServices,
  resetWorkbench,
  fetchWorkbenchServices,
  WorkbenchServicesState,
} from 'store/workbench.slice';
import { configureStore } from '@reduxjs/toolkit';

const createTestStore = () =>
  configureStore({ reducer: { workbench: workbenchReducer } });

describe('workbench reducer', () => {
  const initialState: WorkbenchServicesState = {
    services: {},
    status: 'idle',
  };

  const mockServices = {
    desktop: {
      name: 'Desktop',
      description: 'Virtual Desktop Environment',
      endpoint: 'tools/vnc',
    },
    vscode: {
      name: 'VS Code',
      description: 'VS Code IDE',
      endpoint: 'tools/vscode',
    },
    lab: {
      name: 'Jupyter Lab',
      description: 'Jupyter Lab IDE',
      endpoint: 'lab',
    },
    notebook: {
      name: 'Jupyter Notebook',
      description: 'Jupyter Notebook',
      endpoint: '',
    },
  };

  it('should return the initial state for unknown actions', () => {
    expect(workbenchReducer(undefined, { type: 'unknown' })).toEqual(
      initialState,
    );
  });

  it('should handle setWorkbenchServices', () => {
    const newState = workbenchReducer(
      initialState,
      setWorkbenchServices(mockServices),
    );
    expect(newState.status).toBe('succeeded');
    expect(newState.services).toEqual(mockServices);
  });

  it('should handle resetWorkbench', () => {
    const loadedState: WorkbenchServicesState = {
      services: mockServices,
      status: 'succeeded',
    };
    const newState = workbenchReducer(loadedState, resetWorkbench());
    expect(newState).toEqual(initialState);
  });

  it('should set status to loading when fetchWorkbenchServices is pending', () => {
    const action = { type: fetchWorkbenchServices.pending.type };
    const newState = workbenchReducer(initialState, action);
    expect(newState.status).toBe('loading');
  });

  it('should set services and status to succeeded when fetchWorkbenchServices is fulfilled', () => {
    const action = {
      type: fetchWorkbenchServices.fulfilled.type,
      payload: mockServices,
    };
    const newState = workbenchReducer(initialState, action);
    expect(newState.status).toBe('succeeded');
    expect(newState.services).toEqual(mockServices);
  });

  it('should set status to failed when fetchWorkbenchServices is rejected', () => {
    const action = { type: fetchWorkbenchServices.rejected.type };
    const newState = workbenchReducer(initialState, action);
    expect(newState.status).toBe('failed');
  });

  describe('fetchWorkbenchServices thunk', () => {
    async function assertFallbackBehavior(
      fetchMock: jest.Mock,
      username: string,
    ) {
      globalThis.fetch = fetchMock;
      const store = createTestStore();
      await store.dispatch(
        fetchWorkbenchServices({
          url: `http://example.com/${username}/services`,
          username,
        }),
      );
      expect(store.getState().workbench.status).toBe('succeeded');
      expect(store.getState().workbench.services.desktop).toBeDefined();
      expect(store.getState().workbench.services.desktop.endpoint).toContain(
        username,
      );
      return store;
    }

    it('dispatches fulfilled and stores services when response is valid', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockServices,
      });

      const store = createTestStore();
      await store.dispatch(
        fetchWorkbenchServices({
          url: 'http://example.com/user1/services',
          username: 'user1',
        }),
      );

      expect(store.getState().workbench.status).toBe('succeeded');
      expect(store.getState().workbench.services).toEqual(mockServices);
    });

    it('uses fallback when response JSON fails Zod validation', async () => {
      await assertFallbackBehavior(
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ desktop: { invalid: 'shape' } }),
        }),
        'user1',
      );
    });

    it('uses fallback when fetch response is not ok', async () => {
      await assertFallbackBehavior(
        jest.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        }),
        'user1',
      );
    });

    it('replaces username placeholder in VNC endpoint when using fallback', async () => {
      const store = await assertFallbackBehavior(
        jest.fn().mockRejectedValue(new Error('Network error')),
        'alice',
      );
      const endpoint =
        store.getState().workbench.services.desktop?.endpoint ?? '';
      expect(endpoint).not.toContain('username%2F');
    });
  });
});
