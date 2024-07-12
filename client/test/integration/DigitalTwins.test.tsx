import * as React from 'react';
import {
  getDefaultNormalizer,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import DigitalTwins from '../../src/route/digitaltwins/DigitalTwins';
import tabs from '../../src/route/digitaltwins/DigitalTwinTabData';
import { itHasAllLayoutTestIds } from './integrationTestUtils';
jest.mock('page/Layout', () => ({
  ...jest.requireActual('page/Layout'),
}));

describe('Digital Twins', () => {
  const normalizer = getDefaultNormalizer({
    trim: false,
    collapseWhitespace: false,
  });

  beforeEach(() => {
    render(<DigitalTwins />);
  });

  it('renders the Digital Twins page and Layout correctly', () => {
    itHasAllLayoutTestIds();

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
