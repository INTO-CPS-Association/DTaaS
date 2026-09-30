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
import userEvent from '@testing-library/user-event';
import { uploadGeometry } from 'route/bim/persistGeometry';
import { renderWithRouter } from 'test/unit/unit.testUtil';

jest.mock('react-oidc-context');

jest.mock('route/bim/persistGeometry', () => ({
  uploadGeometry: jest.fn(),
}));

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

  it('hands the conversion to the library, with the model it belongs to', async () => {
    (uploadGeometry as jest.Mock).mockResolvedValue(undefined);
    renderWithRouter(<Bim />, { route: '/private' });

    await userEvent.click(screen.getByTestId('persist-geometry'));

    expect(uploadGeometry).toHaveBeenCalledWith(
      mockURLforLIB,
      'common/models/Substation.ifc',
      expect.any(Uint8Array),
      expect.any(AbortSignal),
    );
  });

  it('stops a write still running when the page is left', async () => {
    (uploadGeometry as jest.Mock).mockResolvedValue(undefined);
    const { unmount } = renderWithRouter(<Bim />, { route: '/private' });
    await userEvent.click(screen.getByTestId('persist-geometry'));
    const signal = (uploadGeometry as jest.Mock).mock
      .calls[0][3] as AbortSignal;

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('reports a refused write instead of losing it', async () => {
    // A workspace with XSRF protection enabled refuses every write, and the
    // cookie that would satisfy it is HttpOnly. Without this line that
    // deployment looks exactly like one where the feature works.
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const failure = new Error('HTTP 403');
    (uploadGeometry as jest.Mock).mockRejectedValue(failure);

    renderWithRouter(<Bim />, { route: '/private' });
    await userEvent.click(screen.getByTestId('persist-geometry'));

    expect(debug).toHaveBeenCalledWith(
      'The conversion was not stored.',
      'common/models/Substation.ifc',
      failure,
    );
    debug.mockRestore();
  });

  it('tells the viewer which folder holds the models', () => {
    // The folder is a DTaaS convention, so DTaaS names it and the viewer is
    // told, instead of the package carrying DTaaS's layout as a default.
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.getByTestId('building-models')).toHaveAttribute(
      'data-directory',
      'common/models',
    );
  });

  it('names the same folder to the person uploading', () => {
    renderWithRouter(<Bim />, { route: '/private' });

    expect(
      screen.getByRole('link', { name: 'common/models' }),
    ).toBeInTheDocument();
  });

  it('renders the viewer', () => {
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.getByTestId('building-models')).toBeInTheDocument();
  });

  it('draws nothing from the library until it knows who is signed in', () => {
    // An address without the user name falls through to this application,
    // which answers with its own HTML page. The viewer would then report that
    // the library returned no JSON, which is true and useless. The name comes
    // from the store or from the sign-in profile, and here neither has it.
    signedInAs(undefined);
    (useAuth as jest.Mock).mockReturnValue({ ...mockAuthState, user: null });
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.queryByTestId('building-models')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Waiting for the signed-in user/),
    ).toBeInTheDocument();
  });

  it('draws at once when the sign-in profile has the name and the store not yet', () => {
    // PrivateRoute stores the name in an effect, after this page's first
    // render. The profile already holds it, so the page does not wait.
    signedInAs(undefined);
    (useAuth as jest.Mock).mockReturnValue({
      ...mockAuthState,
      user: { profile: { preferred_username: 'jady.pamella' } },
    });
    renderWithRouter(<Bim />, { route: '/private' });

    expect(screen.getByTestId('building-models')).toBeInTheDocument();
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

  it('loads the page on demand instead of in the entry chunk', async () => {
    // The route holds a lazy component, so its element renders the Suspense
    // fallback first and the page only after the chunk resolves. This is what
    // keeps the renderer and the geometry kernel out of the entry bundle, and
    // asserting it here is what stops that being undone by accident.
    const route = routes.find((entry) => entry.path === 'bim');
    renderWithRouter(route!.element as React.ReactElement, {
      route: '/private',
    });

    expect(await screen.findByTestId('building-models')).toBeInTheDocument();
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
