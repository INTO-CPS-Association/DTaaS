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
import { Store } from 'redux';

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

      let a = screen.getAllByText(tab.body, {normalizer: getDefaultNormalizer({ collapseWhitespace: false }),})
      expect(a.length).toBeGreaterThan(0);

      // expect(
      //   screen.getByText(tab.body, {
      //     normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      //   })
      // ).toBeInTheDocument();

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

      const firstTabIframe = screen.getAllByTitle(tablabelURLpair.label, {
        exact: false,
      });
      // expect(firstTabIframe).toBeInTheDocument();
      expect(firstTabIframe.length).toBeGreaterThan(0);
      expect(firstTabIframe[0]).toHaveAttribute('src', tablabelURLpair.url + "tree/" + tablabelURLpair.label.toLowerCase());
    });
  });
}
