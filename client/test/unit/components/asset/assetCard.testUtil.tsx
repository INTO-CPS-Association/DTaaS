import { render } from '@testing-library/react';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';

export const asset = {
  name: 'asset',
  description: 'Asset description',
  path: 'path',
  type: 'Digital twins',
  isPrivate: true,
};

export const setupMockStore = (
  assetDescription: string,
  twinDescription: string,
) => {
  const state = {
    assets: {
      items: [
        {
          name: 'asset',
          path: 'path',
          isPrivate: true,
          description: assetDescription,
        },
      ],
    },
    digitalTwin: {
      digitalTwin: {
        asset: { description: twinDescription },
      },
    },
    executionHistory: {
      entries: [],
      selectedExecutionId: null,
      loading: false,
      error: null,
    },
  };
  (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
    (selector) => selector(state),
  );
};

export const renderComponent = <T extends object>(
  Component: React.JSXElementConstructor<T>,
  props: T,
) => {
  render(
    <Provider store={store}>
      <Component {...props} />
    </Provider>,
  );
};
