import * as React from 'react';
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import userEvent from '@testing-library/user-event';
import routes from 'routes';
import { mockUserType } from 'test/__mocks__/global_mocks';

type RouterOptions = {
  route?: string;
  store?: Store;
};

export const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/', store }: RouterOptions = {},
) => {
  globalThis.history.pushState({}, 'Test page', route);

  return store
    ? render(
        <Provider store={store}>
          <RouterComponent ui={ui} route={route} />
        </Provider>,
      )
    : render(<RouterComponent ui={ui} route={route} />);
};

interface RouterComponentProps {
  ui: React.ReactElement;
  route: string;
}

const RouterComponent: React.FC<RouterComponentProps> = ({ ui, route }) => (
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/private" element={ui} />
      {routes.map((routeElement) => (
        <Route
          path={routeElement.path}
          element={routeElement.element}
          key={`route-${routeElement.path.slice(1, -1)}`}
        />
      ))}
    </Routes>
  </MemoryRouter>
);

export function generateTestDivs(testIds: string[]) {
  return testIds.map((id, i) => (
    <div key={i} data-testid={id}>
      Test
    </div>
  ));
}

export function InitRouteTests(component: React.ReactElement) {
  beforeEach(async () => {
    await act(async () => {
      render(component);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders', () => {
    expect(true);
  });
}

export function itDisplaysContentOfTabs(
  tabs: { label: string; body: string }[],
) {
  it('should render labels of all tabs', () => {
    tabs.forEach((tab) => {
      expect(screen.getByRole('tab', { name: tab.label })).toBeInTheDocument();
    });
  });

  it('should render the content of the clicked tab', () => {
    tabs.forEach((tab) => {
      const tabElement = screen.getByRole('tab', { name: tab.label });
      act(() => {
        tabElement.click();
      });

      const a = screen.getAllByText(tab.body, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      });
      expect(a.length).toBeGreaterThan(0);

      tabs
        .filter((otherTab) => otherTab.label !== tab.label)
        .forEach((otherTab) => {
          expect(screen.queryByText(otherTab.body)).not.toBeInTheDocument();
        });
    });
  });
}

export function itDisplaysContentOfExecuteTab(
  tabs: { label: string; body: string }[],
) {
  const executeTab = tabs.find((tab) => tab.label === 'Execute');

  if (!executeTab) return;

  it('should render the label of the Execute tab', () => {
    expect(
      screen.getByRole('tab', { name: executeTab.label }),
    ).toBeInTheDocument();
  });

  it('should render the content of the clicked Execute tab', () => {
    const tabElement = screen.getByRole('tab', { name: executeTab.label });

    act(() => {
      tabElement.click();
    });

    const executeTabContent = screen.getAllByText(executeTab.body, {
      normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
    });
    expect(executeTabContent.length).toBeGreaterThan(0);

    tabs
      .filter((tab) => tab.label !== 'Execute')
      .forEach((otherTab) => {
        expect(screen.queryByText(otherTab.body)).not.toBeInTheDocument();
      });
  });
}

export function itPreventsDefaultActionWhenLinkIsClicked(linkText: string) {
  it(`should prevent default action when ${linkText} is clicked`, () => {
    const linkElement = screen.getByRole('link', { name: linkText });
    const clickEvent = createEvent.click(linkElement);
    fireEvent(linkElement, clickEvent);
    expect(clickEvent.defaultPrevented).toBeTruthy();
  });
}

export function itDisplaysMocks(DisplayedText: string[]) {
  it('should render the mocks', () => {
    DisplayedText.forEach((text) => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });
}

export interface TabLabelURLPair {
  label: string;
  url: string;
}

export function itHasCorrectURLOfTabsWithIframe(
  tablabelsURLpair: TabLabelURLPair[],
) {
  it('should render the Iframe component for the first tab with the correct title and URL', () => {
    tablabelsURLpair.forEach((tablabelURLpair) => {
      const tabElement = screen.getByRole('tab', {
        name: tablabelURLpair.label,
      });
      act(() => {
        tabElement.click();
      });

      const firstTabIframe = screen.getAllByTitle(tablabelURLpair.label, {
        exact: true,
      });

      let tabUsed = tablabelURLpair.label.toLowerCase();
      if (tabUsed === 'digital twins') {
        tabUsed = 'digital_twins';
      }
      const tree = 'tree/';
      const privateTab = '';
      const urlUsed = tablabelURLpair.url + tree + tabUsed + privateTab;
      expect(firstTabIframe.length).toBeGreaterThan(0);
      expect(firstTabIframe[0]).toHaveAttribute('src', urlUsed);
    });
  });
}

export function itHasCorrectTabNameinDTIframe(tablabels: string[]) {
  it('should render the Iframe component on DT page for the first tab with the correct title', () => {
    tablabels.forEach((tablabel) => {
      const tabElement = screen.getByRole('tab', {
        name: tablabel,
      });

      expect(tabElement).toBeTruthy();
    });
  });
}

export function itHasCorrectExecuteTabNameInDTIframe(tablabels: string[]) {
  it("should render the Iframe component on DT page for the 'Execute' tab with the correct title", () => {
    const executeTabLabel = tablabels.find((label) => label === 'Execute');

    if (!executeTabLabel) return;

    const tabElement = screen.getByRole('tab', {
      name: executeTabLabel,
    });

    expect(tabElement).toBeTruthy();
  });
}

export function testStaticAccountProfile(mockUser: mockUserType) {
  const profilePicture = screen.getByTestId('profile-picture');
  expect(profilePicture).toBeInTheDocument();
  expect(profilePicture).toHaveAttribute('src', mockUser.profile.picture);

  const username = screen.getAllByText(
    `${mockUser.profile.preferred_username}`,
  );
  expect(username).not.toBeNull();
  expect(username).toHaveLength(2);

  const profileLink = screen.getByRole('link', {
    name: /SSO OAuth Provider/i,
  });
  expect(profileLink).toBeInTheDocument();
  expect(profileLink).toHaveAttribute('href', mockUser.profile.profile);
}

export async function testAccountSettings(mockUser: mockUserType) {
  await userEvent.click(screen.getByText('Settings'));
  waitFor(() => {
    expect(
      screen.getByRole('heading', { level: 2, name: 'Settings' }),
    ).toBeInTheDocument();

    const settingsParagraph = screen.getByText(/Edit the profile on/);
    expect(settingsParagraph).toHaveProperty(
      'innerHTML',
      `Edit the profile on <b><a href="${mockUser.profile.profile}">SSO OAuth Provider.</a></b>`,
    );
  });

  expect(screen.getByLabelText(/group name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/dt directory/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/common library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/runner tag/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/branch name/i)).toBeInTheDocument();

  const groupNameInput = screen.getByLabelText(/group name/i);
  fireEvent.change(groupNameInput, { target: { value: 'testGroup' } });
  expect(groupNameInput).toHaveValue('testGroup');
}
