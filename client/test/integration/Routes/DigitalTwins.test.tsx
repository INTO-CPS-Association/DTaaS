import * as React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import {
  closestDiv,
  itShowsTheParagraphOfToTheSelectedTab,
  normalizer,
  setupIntegrationTest,
  testLayout,
} from '../integrationTestUtils';

const setup = () => setupIntegrationTest(<DigitalTwins />);

describe('Digital Twins', () => {
  beforeEach(() => {
    setup();
  });

  it('renders the Digital Twins page and Layout correctly', () => {
    const { container } = setup();
    testLayout(container);

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
