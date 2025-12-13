import { fireEvent, render, screen } from '@testing-library/react';
import AddToCartButton from 'preview/components/asset/AddToCartButton';
import * as cartAccess from 'preview/store/CartAccess';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { selectAssetByPathAndPrivacy } from 'preview/store/assets.slice';

describe('AddToCartButton', () => {
  const addMock = jest.fn();
  const removeMock = jest.fn();
  const clearMock = jest.fn();

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectAssetByPathAndPrivacy('path', true)) {
          return mockLibraryAsset;
        }
        return mockLibraryAsset;
      },
    );
  });

  it('should add asset to cart when not in cart', () => {
    jest.spyOn(cartAccess, 'default').mockReturnValue({
      state: { assets: [] },
      actions: {
        add: addMock,
        remove: removeMock,
        clear: clearMock,
      },
    });

    render(<AddToCartButton assetPath="path" assetPrivacy={true} />);

    fireEvent.click(screen.getByRole('button'));
    expect(addMock).toHaveBeenCalled();
  });

  it('should remove asset to cart when not in cart', () => {
    jest.spyOn(cartAccess, 'default').mockReturnValue({
      state: { assets: [mockLibraryAsset] },
      actions: {
        add: addMock,
        remove: removeMock,
        clear: clearMock,
      },
    });

    render(<AddToCartButton assetPath="path" assetPrivacy={true} />);

    fireEvent.click(screen.getByRole('button'));
    expect(removeMock).toHaveBeenCalled();
  });
});
