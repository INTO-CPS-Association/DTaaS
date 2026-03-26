import { renderHook, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import useSidebarLoader from 'route/digitaltwins/editor/useSidebarLoader';
import {
  mockDigitalTwin,
  mockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/__mocks__/global_mocks';
import * as digitalTwinAdapter from 'model/backend/util/digitalTwinAdapter';
import * as sidebarFetchers from 'route/digitaltwins/editor/sidebarFetchers';

jest.mock('model/backend/util/digitalTwinAdapter');
jest.mock('route/digitaltwins/editor/sidebarFetchers');

const mockCreateDT = digitalTwinAdapter.createDigitalTwinFromData as jest.Mock;
const mockFetchData = sidebarFetchers.fetchData as jest.Mock;

const mockState = (
  dtData: Record<string, unknown> | null,
  assets: unknown[] = [],
) => {
  (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
    (selector: (state: unknown) => unknown) =>
      selector({
        digitalTwin: { digitalTwin: dtData ?? {} },
        cart: { assets },
      }),
  );
};

describe('useSidebarLoader', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    mockCreateDT.mockResolvedValue(mockDigitalTwin);
    mockFetchData.mockResolvedValue(undefined);
  });

  it('returns not loading and null instance when no name given', async () => {
    mockState(null);

    const { result } = renderHook(() =>
      useSidebarLoader({ name: undefined, tab: 'create' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.digitalTwinInstance).toBeNull();
  });

  it('loads digital twin instance when name and data are present', async () => {
    const dtData = createMockDigitalTwinData('myDT');
    mockState({ myDT: dtData });

    const { result } = renderHook(() =>
      useSidebarLoader({ name: 'myDT', tab: 'reconfigure' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockCreateDT).toHaveBeenCalledWith(dtData, 'myDT');
    expect(mockFetchData).toHaveBeenCalledWith(mockDigitalTwin);
    expect(result.current.digitalTwinInstance).toBe(mockDigitalTwin);
  });

  it('sets instance to null when createDigitalTwinFromData throws', async () => {
    const dtData = createMockDigitalTwinData('failDT');
    mockState({ failDT: dtData });
    mockCreateDT.mockRejectedValue(new Error('init failed'));

    const { result } = renderHook(() =>
      useSidebarLoader({ name: 'failDT', tab: 'reconfigure' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.digitalTwinInstance).toBeNull();
  });

  it('dispatches library files for create tab with assets', async () => {
    const asset = {
      ...mockLibraryAsset,
      configFiles: ['config1.json', 'config2.json'],
      getConfigFiles: jest.fn().mockImplementation(function getConfigFilesMock(
        this: typeof mockLibraryAsset,
      ) {
        this.configFiles = ['config1.json', 'config2.json'];
        return Promise.resolve();
      }),
      path: 'common/myAsset',
      isPrivate: false,
    };
    mockState(null, [asset]);

    renderHook(() => useSidebarLoader({ name: undefined, tab: 'create' }));

    await waitFor(() => {
      expect(asset.getConfigFiles).toHaveBeenCalled();
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('skips library loading for non-create tab', async () => {
    const asset = {
      ...mockLibraryAsset,
      getConfigFiles: jest.fn(),
    };
    mockState(null, [asset]);

    const { result } = renderHook(() =>
      useSidebarLoader({ name: undefined, tab: 'reconfigure' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(asset.getConfigFiles).not.toHaveBeenCalled();
  });

  it('sets null instance when name is present but data is missing', async () => {
    mockState({});

    const { result } = renderHook(() =>
      useSidebarLoader({ name: 'nonexistent', tab: 'reconfigure' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.digitalTwinInstance).toBeNull();
    expect(mockCreateDT).not.toHaveBeenCalled();
  });
});
