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
  { route = '/', store }: RouterOptions = {},
) => {
  window.history.pushState({}, 'Test page', route);

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
