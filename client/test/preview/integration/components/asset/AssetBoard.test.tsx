import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import store from 'store/store';
import AssetBoard from 'preview/components/asset/AssetBoard';
import * as React from 'react';

const setup = (tab: string = 'Manage', error: string | null = null) => {
  // Dispatch initial state to the store
  store.dispatch({
    type: 'assets/setItems',
    payload: [
      { path: 'asset1', name: 'AssetName' }, // Provide actual asset data
    ],
  });

  render(
    <Provider store={store}>
      <AssetBoard tab={tab} error={error} />
    </Provider>,
  );
};

describe('AssetBoard', () => {
  beforeEach(() => {
    setup();
  });

  it('deletes an asset on Delete button click', async () => {
    // Render the component
    setup();

    // Ensure the asset is present before the delete action
    expect(screen.getByText(/AssetName/i)).toBeInTheDocument();

    // Click the delete button
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await userEvent.click(deleteButton);

    // Verify the asset is deleted
    expect(screen.queryByText(/AssetName/i)).not.toBeInTheDocument();
  });
});
