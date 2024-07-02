import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import Library from '../../src/route/library/Library';
import { render } from '@testing-library/react';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

function setupTest() {
  const userMock = {
    profile: {
      profile: 'example/username',
    },
    access_token: 'example_token',
  };

  (useAuth as jest.Mock).mockReturnValue({ user: userMock });

  render(<Library />);
}

describe('Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the library menu, header, footer and iframe components', () => {
    setupTest();
  });
})