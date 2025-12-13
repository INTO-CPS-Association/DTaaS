import { screen, within } from '@testing-library/react';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import userEvent from '@testing-library/user-event';
import {
  closestDiv,
  itShowsTheParagraphOfToTheSelectedTab,
  normalizer,
  setupIntegrationTest,
} from 'test/integration/integration.testUtil';
import { testLayout } from 'test/integration/Routes/routes.testUtil';

const setup = () => setupIntegrationTest('/digitaltwins');

describe('Digital Twins', () => {
  beforeEach(async () => {
    await setup();
  });

  it('renders the Digital Twins page and Layout correctly', async () => {
    await testLayout();

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

  it('shows the paragraph of to the selected tab', async () => {
    await itShowsTheParagraphOfToTheSelectedTab([tabs]);
  });

  it('changes iframe src according to the selected tab', async () => {
    await tabs.reduce(async (previousPromise, tabsData, tabsIndex) => {
      await previousPromise;
      const isFirstTab = tabsIndex === 0;
      const tab = screen.getByRole('tab', {
        name: tabsData.label,
        selected: isFirstTab,
      });
      await userEvent.click(tab);
      const iframe = screen.getByTitle(`JupyterLight-Demo-${tabsData.label}`);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveProperty('src', `https://example.com/URL_DT`);
    }, Promise.resolve());
  });
});
