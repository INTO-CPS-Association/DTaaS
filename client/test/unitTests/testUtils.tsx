import * as React from 'react';
import {
  act,
  createEvent,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Store, PreloadedState } from 'redux';
import { RootState, setupStore } from 'store/Redux/store';

type RouterOptions = {
  route?: string;
  store?: Store;
};

export const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/', store }: RouterOptions = {}
) => {
  window.history.pushState({}, 'Test page', route);

  return store
    ? render(
        <Provider store={store}>
          <RouterComponent ui={ui} route={route} />
        </Provider>
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
      <Route path="/" element={<div>Signin</div>} />
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

/**
 * All route components should be tested with this function. It renders the component and checks if it renders.
 * @param component The component to be tested
 */
export function InitRouteTests(component: React.ReactElement) {
  beforeEach(async () => {
    await act(async () => {
      render(component);
    });
  });

  it('renders', () => {
    expect(true);
  });
}

/**
 * Tests if the component renders the given text on all tabs
 * @param tabs An array of objects with the label and the body of the tab
 */
export function itDisplaysContentOfTabs(
  tabs: { label: string; body: string }[]
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
      expect(
        screen.getByText(tab.body, {
          normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
        })
      ).toBeInTheDocument();

      // Expect the other tabs to not be rendered
      tabs
        .filter((otherTab) => otherTab.label !== tab.label)
        .forEach((otherTab) => {
          expect(screen.queryByText(otherTab.body)).not.toBeInTheDocument();
        });
    });
  });
}

/**
 * Ensure that the default action is prevented when a link is clicked. Links are identified by their text.
 * @param linkText The text of the link
 */
export function itPreventsDefaultActionWhenLinkIsClicked(linkText: string) {
  it(`should prevent default action when ${linkText} is clicked`, () => {
    const linkElement = screen.getByRole('link', { name: linkText });
    const clickEvent = createEvent.click(linkElement);
    fireEvent(linkElement, clickEvent);
    expect(clickEvent.defaultPrevented).toBeTruthy();
  });
}

/**
 * Makes sure that the mocks are displayed
 * @param DisplayedText An array of strings that should be displayed
 */
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

/**
 * Used to test if the correct Iframe is rendered when a tab is clicked.
 * @param tablabelsURLpair An array of objects with the label and the URL of the tab
 */
export function itHasCorrectURLOfTabsWithIframe(
  tablabelsURLpair: TabLabelURLPair[]
) {
  it('should render the Iframe component for the first tab with the correct title and URL', () => {
    tablabelsURLpair.forEach((tablabelURLpair) => {
      const tabElement = screen.getByRole('tab', {
        name: tablabelURLpair.label,
      });
      act(() => {
        tabElement.click();
      });
      const firstTabIframe = screen.getByTitle(tablabelURLpair.label, {
        exact: false,
      });
      expect(firstTabIframe).toBeInTheDocument();
      expect(firstTabIframe).toHaveAttribute('src', tablabelURLpair.url);
    });
  });
}

// #####################################################################################
// # The following functions are used to test the Redux store.                         #

interface RenderProps {
  children: React.ReactNode;
  initialState?: RootState;
}

/**
 * Create a wrapper for the component to be tested.
 * 
 * This wrapper can be used with the render and the render-hook functions from `@testing-library`.
 * Example usage:
 * ```tsx
 * const initUser = wrapWithInitialState({
    auth: { userName: "user1" }
  });

  render(<ComponentToBeTested />, {
    wrapper: initUser
  });
  ```
 * @param initialState Optional initial state for the store
 * @returns 
 */
export const wrapWithInitialState = (
  initialState?: PreloadedState<RootState>
) => {
  const renderWithStore: React.FC<RenderProps> = ({
    children,
  }: RenderProps) => {
    const store = setupStore(initialState);
    return <Provider store={store}>{children}</Provider>;
  };
  return renderWithStore;
};

// #####################################################################################
