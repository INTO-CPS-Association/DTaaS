import {
  cleanup,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { ITabs } from 'route/IData';
import store from 'store/store';
import AppProvider from 'AppProvider';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import routes from 'routes';
import { mockAuthState, mockAuthStateType } from '../__mocks__/global_mocks';

export const normalizer = getDefaultNormalizer({
  trim: false,
  collapseWhitespace: false,
});

const renderWithAppProvider = (route: string) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    AppProvider({
      children: (
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            {routes.map((routeElement) => (
              <Route
                path={routeElement.path}
                element={routeElement.element}
                key={`route-${routeElement.path.slice(1, -1)}`}
              />
            ))}
            ;
          </Routes>
        </MemoryRouter>
      ),
    }),
  );
};

export async function setupIntegrationTest(
  route: string,
  authState?: mockAuthStateType,
) {
  cleanup();
  const returnedAuthState = authState ?? mockAuthState;

  (useAuth as jest.Mock).mockReturnValue({
    ...returnedAuthState,
  });

  if (returnedAuthState.isAuthenticated) {
    store.dispatch({
      type: 'auth/setUserName',
      payload: returnedAuthState.user!.profile.profile!.split('/')[1],
    });
  } else {
    store.dispatch({ type: 'auth/setUserName', payload: undefined });
  }
  const container = await act(async () => renderWithAppProvider(route));
  return container;
}

export function closestDiv(element: HTMLElement) {
  const div = element.closest('div');
  expect(div).toBeInTheDocument();
  return div!;
}

export async function itShowsTheTooltipWhenHoveringButton(toolTipText: string) {
  const button = screen.getByLabelText(toolTipText);
  expect(
    screen.queryByRole('tooltip', { name: toolTipText }),
  ).not.toBeInTheDocument();
  await userEvent.hover(button);
  await waitFor(() => {
    expect(
      screen.getByRole('tooltip', { name: toolTipText }),
    ).toBeInTheDocument();
  });

  await userEvent.unhover(button);
  await waitFor(() => {
    expect(
      screen.queryByRole('tooltip', { name: toolTipText }),
    ).not.toBeInTheDocument();
  });
}

/* eslint-disable no-await-in-loop */
export async function itShowsTheParagraphOfToTheSelectedTab(
  tablistsData: ITabs[][],
) {
  for (
    let tablistsIndex = 0;
    tablistsIndex < tablistsData.length;
    tablistsIndex += 1
  ) {
    const tablistData = tablistsData[tablistsIndex];
    for (let tabIndex = 0; tabIndex < tablistData.length; tabIndex += 1) {
      const tabData = tablistData[tabIndex];
      const isFirstTab = tabIndex === 0;
      const tab = screen.getByRole('tab', {
        name: tabData.label,
        selected: isFirstTab,
      });
      expect(tab).toBeInTheDocument();

      await userEvent.click(tab);

      const tabParagraph = screen.getByText(tabData.body, {
        normalizer,
      });
      expect(tabParagraph).toBeInTheDocument();
    }
  }
}
/* eslint-enable no-await-in-loop */
