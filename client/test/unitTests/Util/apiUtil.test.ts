import { renderHook } from '@testing-library/react';
import useAssets from 'util/apiUtil';
import { Asset } from 'components/asset/Asset';
import { wrapWithInitialState } from '../testUtils';
import { mockAssets, testPath } from '../__mocks__/util_mocks';

jest.unmock('util/apiUtil');
jest.mock('util/queries/gitLab', () => ({
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
  useLazyLoadQuery: () => generateMockGraphQLtreeWithAssets(fakeAssets),
}));

describe('useAssets', () => {
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

  it('handles multiple assets returned from server', () => {
    fakeAssets = mock3Assets;
    renderHook(
      () => {
        const assets = useAssets(testPath);
        expect(assets.length).toBe(mock3Assets.length);
        assets.forEach((asset, index) => {
          expect(asset.name).toBe(mock3Assets[index].name);
          expect(asset.path).toBe(mock3Assets[index].path);
        });
      },
      { wrapper: initUser }
    );
  });

  it('handles only 1 asset returned from server', () => {
    mock3Assets.forEach((asset) => {
      fakeAssets = [asset];
      renderHook(
        () => {
          const assets = useAssets(testPath);
          expect(assets.length).toBe(1);
          expect(assets[0].name).toBe(asset.name);
          expect(assets[0].path).toBe(asset.path);
        },
        { wrapper: initUser }
      );
    });
  });

  it('displays correct descriptions', () => {
    const path = '/tools';
    fakeAssets = [
      {
        name: 'test1',
        path: `${path}/test1`,
        description: 'test1 description',
      },
      {
        name: 'test2',
        path: `${path}/test2`,
        description: 'test2 description',
      },
      {
        name: 'test3',
        path: `${path}/test3`,
      },
    ];
    renderHook(
      () => {
        const assets = useAssets(path);
        expect(assets.length).toBe(fakeAssets.length);
        expect(assets[0].description).toBe('test1 description');
        expect(assets[1].description).toBe('test2 description');
        expect(assets[2].description).toBe(undefined);
      },
      { wrapper: initUser }
    );
  });

  // Add more tests here to determin path and username has been set correctly
});

// ###########################################################
// ********************API UTILS*****************************

interface Accumulator {
  blobs: { rawTextBlob: string; path: string }[];
  trees: { name: string; path: string }[];
}

/**
 * Generates a mock GraphQL tree with assets.
 * @param assets An array of assets
 * @returns Assets in a GraphQL tree structure
 */
function generateMockGraphQLtreeWithAssets(assets: Asset[]) {
  const initial: Accumulator = { blobs: [], trees: [] };
  const { blobs: files, trees: directories } = assets.reduce(
    (accumulatedStructure, asset) => {
      const node = { name: asset.name, path: asset.path };
      accumulatedStructure.trees.push(node);
      if (asset.description) {
        accumulatedStructure.blobs.push({
          path: `${asset.path}/README.md`,
          rawTextBlob: asset.description,
        });
      }
      return accumulatedStructure;
    },
    initial
  );

  return {
    project: {
      repository: {
        blobs: { nodes: files },
        paginatedTree: {
          nodes: [{ trees: { nodes: directories } }],
        },
      },
    },
  };
}
