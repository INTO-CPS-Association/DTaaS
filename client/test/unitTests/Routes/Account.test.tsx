import React from 'react';
import { render } from '@testing-library/react';
import Account from './Account';

describe('Account component', () => {
  it('renders AccountTabs component', () => {
    const { getByTestId } = render(<Account />);
    const accountTabsElement = getByTestId('account-tabs');
    expect(accountTabsElement).toBeInTheDocument();
  });

});
