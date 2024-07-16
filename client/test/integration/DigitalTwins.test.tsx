import * as React from 'react';
import {
  getDefaultNormalizer,
  fireEvent,
  render,
  screen,
  within,
  cleanup,
} from '@testing-library/react';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { testFooter, testMenu, testToolbar } from './integrationTestUtils';

jest.mock('page/Layout', () => ({
  ...jest.requireActual('page/Layout'),
}));

jest.mock('page/Footer', () => ({
  ...jest.requireActual('page/Footer'),
}));

jest.mock('@mui/material/Toolbar', () => ({
  ...jest.requireActual('@mui/material/Toolbar'),
}));

jest.mock('page/Menu', () => ({
  ...jest.requireActual('page/Menu'),
}));

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

describe('Digital Twins', () => {
  const uiToRender = (
    <MemoryRouter>
      <DigitalTwins />
    </MemoryRouter>
  );

  const normalizer = getDefaultNormalizer({
    trim: false,
    collapseWhitespace: false,
  });

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: RootState) => object) =>
        selector({
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    render(uiToRender);
  });

  it('renders the Digital Twins page and Layout correctly', () => {
    cleanup();
    const { container } = render(uiToRender);

    testMenu();
    testToolbar(container);
    testFooter();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    // The div of the Digital Twins (Create, Execute and Analyze) tabs
    const mainTabsDiv = tablists[0].closest('div');
    expect(mainTabsDiv).toBeInTheDocument();

    const mainTablist = within(mainTabsDiv!).getAllByRole('tablist')[0];
    const mainTabs = within(mainTablist).getAllByRole('tab');
    expect(mainTabs).toHaveLength(3);

    mainTabs.forEach((tab, i) => {
      expect(tab).toHaveTextContent(tabs[i].label);
    });

    const mainParagraph = screen.getByText(tabs[0].body, { normalizer });
    expect(mainParagraph).toBeInTheDocument();

    const mainParagraphDiv = mainParagraph.closest('div');
    expect(mainParagraphDiv).toBeInTheDocument();

    const iframe = within(mainParagraphDiv!).getByTitle(
      /JupyterLight-Demo-Create/i,
    );
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty('src', 'https://example.com/URL_DT');
  });

  it('shows the paragraph correlating to the tab that is selected', () => {
    const tablistsData = [tabs];
    for (let i = 0; i < tablistsData.length; i += 1) {
      const tablistData = tablistsData[i];
      for (let j = 0; j < tablistsData[i].length; j += 1) {
        const tabData = tablistData[j];
        const isFirstTab = j === 0;
        const tab = screen.getByRole('tab', {
          name: tabData.label,
          selected: isFirstTab,
        });
        expect(tab).toBeInTheDocument();

        fireEvent.click(tab);

        const tabParagraph = screen.getByText(tabData.body, {
          normalizer,
        });

        expect(tabParagraph).toBeInTheDocument();
      }
    }
  });

  it('changes iframe src according to the the selected tab', () => {
    for (let i = 0; i < tabs.length; i += 1) {
      const tabsData = tabs[i];
      const isFirstTab = i === 0;
      const tab = screen.getByRole('tab', {
        name: tabsData.label,
        selected: isFirstTab,
      });
      fireEvent.click(tab);
      const iframe = screen.getByTitle(`JupyterLight-Demo-${tabsData.label}`);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveProperty('src', `https://example.com/URL_DT`);
    }
  });
});
