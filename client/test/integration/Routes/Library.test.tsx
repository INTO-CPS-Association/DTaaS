import { screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assetType, scope } from 'route/library/LibraryTabData';
import {
  normalizer,
  closestDiv,
  itShowsTheParagraphOfToTheSelectedTab,
  setupIntegrationTest,
} from 'test/integration/integration.testUtil';
import { testLayout } from 'test/integration/Routes/routes.testUtil';

const setup = () => setupIntegrationTest('/library');

describe('Library', () => {
  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    cleanup();

    jest.clearAllTimers();
  });

  it('renders the Library and Layout correctly', async () => {
    await testLayout();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    const mainTabsDiv = closestDiv(tablists[0]);
    const mainTablist = within(mainTabsDiv).getAllByRole('tablist')[0];
    const mainTabs = within(mainTablist).getAllByRole('tab');
    expect(mainTabs).toHaveLength(5);

    const mainParagraph = screen.getByText(assetType[0].body, { normalizer });
    expect(mainParagraph).toBeInTheDocument();

    const mainParagraphDiv = closestDiv(mainParagraph);

    // The div of the scope (Private and Common) tabs within the chosen assetType tab
    const subTabsDiv = closestDiv(mainParagraphDiv.parentElement!);

    const subTabslist = within(subTabsDiv).getByRole('tablist');
    expect(subTabslist).toBeInTheDocument();
    const subTabs = within(subTabslist).getAllByRole('tab');
    expect(subTabs).toHaveLength(2);

    const subParagraph = screen.getByText(scope[0].body, { normalizer });
    expect(subParagraph).toBeInTheDocument();

    const subiframe = screen.getByTitle(assetType[0].label);
    expect(subiframe).toBeInTheDocument();
    const assetTypeSegment = `${assetType[0].label.replace(' ', '_').toLowerCase()}`;
    expect(subiframe).toHaveProperty(
      'src',
      `https://example.com/URL_LIBtree/${assetTypeSegment}`,
    );
  });

  it('shows the paragraph of to the selected tab', async () => {
    await itShowsTheParagraphOfToTheSelectedTab([assetType, scope]);
  });

  it('selects the first scope tab when you select an assetType tab', async () => {
    // Starting from 1 as the first tab is already selected so we won't need to click it

    await assetType.slice(1).reduce(async (previousPromise, assetTypeData) => {
      await previousPromise;
      const commonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(commonTab).toBeInTheDocument();

      await userEvent.click(commonTab);

      expect(commonTab).toHaveAttribute('aria-selected', 'true');

      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: false,
      });

      expect(assetTypeTab).toBeInTheDocument();

      await userEvent.click(assetTypeTab);

      expect(assetTypeTab).toHaveAttribute('aria-selected', 'true');

      const newCommonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(newCommonTab).toBeInTheDocument();

      await setup();
    }, Promise.resolve());
  });

  it('does not change the selected assetType tab when you select a scope tab', async () => {
    await assetType.reduce(
      async (previousPromise, assetTypeData, assetTypeIndex) => {
        await previousPromise;
        const isFirstAssetTypeTab = assetTypeIndex === 0;
        const assetTypeTab = screen.getByRole('tab', {
          name: assetTypeData.label,
          selected: isFirstAssetTypeTab,
        });
        await userEvent.click(assetTypeTab);

        await scope.reduce(async (prevScopePromise, scopeData, scopeIndex) => {
          await prevScopePromise;
          const isFirstScopeTab = scopeIndex === 0;
          const scopeTab = screen.getByRole('tab', {
            name: scopeData.label,
            selected: isFirstScopeTab,
          });
          await userEvent.click(scopeTab);
          const scopeTabAfterClicks = screen.getByRole('tab', {
            name: scopeData.label,
            selected: true,
          });
          const assetTypeTabAfterClicks = screen.getByRole('tab', {
            name: assetTypeData.label,
            selected: true,
          });
          expect(scopeTabAfterClicks).toBeInTheDocument();
          expect(assetTypeTabAfterClicks).toBeInTheDocument();
        }, Promise.resolve());
      },
      Promise.resolve(),
    );
  }, 15000);

  it('changes iframe src according to the combination of the selected tabs', async () => {
    await assetType.reduce(
      async (previousPromise, assetTypeData, assetTypeIndex) => {
        await previousPromise;
        const isFirstAssetTypeTab = assetTypeIndex === 0;
        const assetTypeTab = screen.getByRole('tab', {
          name: assetTypeData.label,
          selected: isFirstAssetTypeTab,
        });
        await userEvent.click(assetTypeTab);

        await scope.reduce(async (prevScopePromise, scopeData, scopeIndex) => {
          await prevScopePromise;
          const isFirstScopeTab = scopeIndex === 0;
          const scopeTab = screen.getByRole('tab', {
            name: scopeData.label,
            selected: isFirstScopeTab,
          });
          await userEvent.click(scopeTab);
          const iframe = screen.getByTitle(assetTypeData.label);
          const scopeSegment = `${isFirstScopeTab ? '' : 'common/'}`;
          const assetTypeSegment = `${assetTypeData.label.replace(' ', '_').toLowerCase()}`;
          expect(iframe).toBeInTheDocument();
          expect(iframe).toHaveProperty(
            'src',
            `https://example.com/URL_LIBtree/${scopeSegment}${assetTypeSegment}`,
          );
        }, Promise.resolve());
      },
      Promise.resolve(),
    );
  }, 15000);
});
