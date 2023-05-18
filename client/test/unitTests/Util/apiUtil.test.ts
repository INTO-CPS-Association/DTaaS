import { renderHook } from '@testing-library/react';
import useAssets from 'util/apiUtil';
import { Asset } from 'models/Asset';
import {
  generateMockGraphQLtreeWithAssets,
  wrapWithInitialState,
} from '../testUtils';
import { mockAssets, testPath } from '../__mocks__/util_mocks';

jest.unmock('util/apiUtil');
jest.mock('util/queries/gitLabQueries', () => ({
  __esModule: true,
  default: 'query',
}));

const mock3Assets: Asset[] = mockAssets;

const initUser = wrapWithInitialState({
  auth: {
    userName: 'user1',
  },
});

let fakeAssets: Asset[] = [];

jest.mock('react-relay', () => ({
  __esModule: true,
  useLazyLoadQuery: () =>
    fakeAssets.length !== 0
      ? generateMockGraphQLtreeWithAssets(fakeAssets)
      : [],
}));

describe('useAssets', () => {
  it('returns assets for given directory path', async () => {
    fakeAssets = mock3Assets;
    renderHook(
      () => {
        const assets = useAssets(testPath);
        expect(assets.length).toBe(mock3Assets.length);
      },
      { wrapper: initUser }
    );
  });

  it('returns empty array if no assets found', async () => {
    fakeAssets = [];
    renderHook(
      () => {
        const assets = useAssets(testPath);
        expect(assets.length).toBe(0);
      },
      { wrapper: initUser }
    );
  });

  it('detects directories', async () => {
    fakeAssets = mock3Assets;
    renderHook(
      () => {
        const assets = useAssets(testPath);
        expect(assets[2].isDir).toBe(true);
      },
      { wrapper: initUser }
    );
  });

  it('detects files', async () => {
    fakeAssets = mock3Assets;
    renderHook(
      () => {
        const assets = useAssets(testPath);
        expect(assets[0].isDir).toBe(false); // Not the most robust test, but it works
      },
      { wrapper: initUser }
    );
  });

  it('handles only 1 entry', () => {
    mock3Assets.forEach((asset) => {
      fakeAssets = [asset];
      renderHook(
        () => {
          const assets = useAssets(testPath);
          expect(assets.length).toBe(1);
          expect(assets[0].name).toBe(asset.name);
          expect(assets[0].path).toBe(asset.path);
          expect(assets[0].isDir).toBe(asset.isDir);
        },
        { wrapper: initUser }
      );
    });
  });

  // Add more tests here to determin path and username has been set correctly
});
