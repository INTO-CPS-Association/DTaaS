/**
 * Tests for the Building Models route.
 *
 * The route is an adapter, so these check the two things an adapter can get
 * wrong: whether the page is reachable at all, and whether it hands the viewer
 * the library URL this deployment configured. What the viewer then draws is
 * tested where the viewer is built.
 *
 * The viewer itself is replaced by `test/__mocks__/bimViewerMock.tsx`, mapped
 * in `jest.config.json`. It draws with WebGL, which jsdom does not have.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import { useDispatch, useSelector } from 'react-redux';
import Bim from 'route/bim/Bim';
import routes from 'routes';
import { mockAuthState, mockURLforLIB } from 'test/__mocks__/global_mocks';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('react-oidc-context');

jest.mock('page/Layout', () => {
  const react = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { children: unknown }) =>
      react.createElement('div', null, props.children),
  };
});

/** Put a user name in the store the way the auth slice holds it, or none. */
function signedInAs(userName: string | undefined) {
  (useSelector as unknown as jest.Mock).mockImplementation(
    (select: (state: unknown) => unknown) => select({ auth: { userName } }),
  );
}

describe('Bim', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockAuthState);
    // The shared mocks replace useDispatch with a bare jest.fn(), which
    // returns undefined. The route stores the signed-in user name the way
    // every other route does, so it needs a dispatch it can call.
    (useDispatch as unknown as jest.Mock).mockReturnValue(jest.fn());
    signedInAs('jady.pamella');
  });

  it('renders the viewer', () => {
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.getByTestId('building-models')).toBeInTheDocument();
  });

  it('draws nothing from the library until it knows who is signed in', () => {
    // The address is built from the user name whether or not it is known, so
    // for the first render it reads .../undefined/..., which falls through to
    // this application and answers with its own HTML page. The viewer then
    // reports that the library returned no JSON, which is true and useless.
    signedInAs(undefined);
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.queryByTestId('building-models')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Waiting for the signed-in user/),
    ).toBeInTheDocument();
  });

  it('passes the library URL this deployment configured', () => {
    // The route must not build a URL of its own. A hard-coded host here is
    // the failure that only shows up on someone else's install.
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.getByTestId('building-models')).toHaveAttribute(
      'data-library-url',
      mockURLforLIB,
    );
  });
});

describe('the bim route', () => {
  it('is registered', () => {
    expect(routes.some((route) => route.path === 'bim')).toBe(true);
  });

  it('leaves the routes the release already had', () => {
    // This fork adds a route. Removing one would be a change to DTaaS, which
    // is what the whole arrangement is meant to avoid.
    const paths = routes.map((route) => route.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        'library',
        'digitaltwins',
        'account',
        'workbench',
      ]),
    );
  });
});
