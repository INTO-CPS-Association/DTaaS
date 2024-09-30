import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import AssetBoard, { handleDelete } from 'preview/components/asset/AssetBoard';
import store from 'store/store';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useSelector: jest.fn(),
    useDispatch: jest.fn(),
}));

jest.mock('preview/components/asset/AssetCard', () => ({
    AssetCardExecute: () => <div>Asset Card</div>,
}));

jest.mock('store/assets.slice', () => ({
    ...jest.requireActual('store/assets.slice'),
    deleteAsset: jest.fn(),
}));

describe('AssetBoard', () => {
    const mockDispatch = jest.fn();

    const renderAssetBoard = (error: null | string) => {
        return render(
            <Provider store={store}>
                <AssetBoard tab="testTab" error={error} />
            </Provider>,
        );
    }

    beforeEach(() => {
        (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

        const mockAssets = [{ name: 'Asset 1', description: 'Test Asset', path: 'path1' }];

        (useSelector as jest.Mock).mockImplementation((selector) =>
            selector({
                assets: { items: mockAssets },
            }),
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders AssetBoard with assets', () => {

        renderAssetBoard(null);

        expect(screen.getByText('Asset Card')).toBeInTheDocument();
    });

    it('renders error message when error is present', () => {
        renderAssetBoard('An error occurred');

        expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('deletes asset when onDelete is called', () => {
        renderAssetBoard(null);

        handleDelete('path1', mockDispatch)();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
});
