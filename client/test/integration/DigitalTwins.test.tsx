import * as React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import { useAuth } from 'react-oidc-context';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import {
  closestDiv,
  itShowsTheParagraphOfToTheSelectedTab,
  normalizer,
  renderWithMemoryRouter,
  testLayout,
} from './integrationTestUtils';

jest.mock('components/LinkButtons', () => ({
  ...jest.requireActual('components/LinkButtons'),
}));

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
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: RootState) => object) =>
        selector({
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    renderWithMemoryRouter(<DigitalTwins />);
  });

  it('renders the Digital Twins page and Layout correctly', () => {
    testLayout();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    // The div of the Digital Twins (Create, Execute and Analyze) tabs
    const mainTabsDiv = closestDiv(tablists[0]);
    const mainTablist = within(mainTabsDiv).getAllByRole('tablist')[0];
    const mainTabs = within(mainTablist).getAllByRole('tab');
    expect(mainTabs).toHaveLength(3);

    mainTabs.forEach((tab, tabIndex) => {
      expect(tab).toHaveTextContent(tabs[tabIndex].label);
    });

    const mainParagraph = screen.getByText(tabs[0].body, { normalizer });
    expect(mainParagraph).toBeInTheDocument();

    const mainParagraphDiv = closestDiv(mainParagraph);
    const iframe = within(mainParagraphDiv).getByTitle(
      /JupyterLight-Demo-Create/i,
    );
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty('src', 'https://example.com/URL_DT');
  });

  itShowsTheParagraphOfToTheSelectedTab([tabs]);

  it('changes iframe src according to the selected tab', () => {
    tabs.forEach((tabsData, tabsIndex) => {
      const isFirstTab = tabsIndex === 0;
      const tab = screen.getByRole('tab', {
        name: tabsData.label,
        selected: isFirstTab,
      });
      fireEvent.click(tab);
      const iframe = screen.getByTitle(`JupyterLight-Demo-${tabsData.label}`);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveProperty('src', `https://example.com/URL_DT`);
    });
  });
});
