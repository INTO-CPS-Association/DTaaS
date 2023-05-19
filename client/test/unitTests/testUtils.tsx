import * as React from 'react';
import {
  act,
  createEvent,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { PreloadedState } from 'redux';
import { RootState, setupStore } from 'store/Redux/store';

export function generateTestDivs(testIds: string[]) {
  return testIds.map((id, i) => (
    <div key={i} data-testid={id}>
      Test
    </div>
  ));
}

export function InitRouteTests(component: React.ReactElement) {
  beforeEach(() => {
    render(component);
  });

  it('renders', () => {
    expect(true);
  });
}

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

export function itPreventsDefaultActionWhenLinkIsClicked(linkText: string) {
  it(`should prevent default action when ${linkText} is clicked`, () => {
    const linkElement = screen.getByRole('link', { name: linkText });
    // Simulate click event on see more link
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
