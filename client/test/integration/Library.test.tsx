import * as React from 'react';
import {
  getDefaultNormalizer,
  render,
  screen,
  within,
  cleanup,
} from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import userEvent from '@testing-library/user-event';
import Library from '../../src/route/library/Library';
import { assetType, scope } from '../../src/route/library/LibraryTabData';

jest.mock('page/Layout', () => ({
  ...jest.requireActual('page/Layout'),
}));

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

describe('Library', () => {
  const normalizer = getDefaultNormalizer({
    trim: false,
    collapseWhitespace: false,
  });

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    render(<Library></Library>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('renders the Library and Layout correctly', () => {
    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    // The div of the assetType (Functions, Models, etc.) tabs
    const mainTabsDiv = tablists[0].closest('div');
    expect(mainTabsDiv).toBeInTheDocument();

    const mainTablist = within(mainTabsDiv!).getAllByRole('tablist')[0];
    const mainTabs = within(mainTablist).getAllByRole('tab');
    expect(mainTabs).toHaveLength(5);

    const mainParagraph = screen.getByText(assetType[0].body, { normalizer });
    expect(mainParagraph).toBeInTheDocument();

    const mainParagraphDiv = mainParagraph.closest('div');
    expect(mainParagraphDiv).toBeInTheDocument();

    // The div of the scope (Private and Common) tabs within the chosen assetType tab
    const subTabsDiv = mainParagraphDiv!.parentElement!.closest('div')!;
    expect(subTabsDiv).toBeInTheDocument();

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

  it('shows the paragraph correlating to the tab that is selected', async () => {
    const user = userEvent.setup();
    const tablists = screen.getAllByRole('tablist');
    const tablistsData = [assetType, scope];
    for (let i = 0; i < tablists.length; i++) {
      const tablistData = tablistsData[i];
      for (let j = 0; j < tablistsData[i].length; j++) {
        const tabData = tablistData[j];
        const isFirstTab = j === 0;
        const tab = screen.getByRole('tab', {
          name: tabData.label,
          selected: isFirstTab,
        });
        expect(tab).toBeInTheDocument();

        await user.click(tab);

        const tabParagraph = screen.getByText(tabData.body, {
          normalizer,
        });

        expect(tabParagraph).toBeInTheDocument();
      }
    }
  });

  it('selects the first scope tab when you select an assetType tab', async () => {
    const user = userEvent.setup();
    // i is 1 as the first tab is already selected so clicking on it will not have an effect on the subtabs
    for (let i = 1; i < assetType.length; i += 1) {
      const commonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(commonTab).toBeInTheDocument();

      await user.click(commonTab);

      expect(commonTab).toHaveAttribute('aria-selected', 'true');

      const assetTypeTab = screen.getByRole('tab', {
        name: assetType[i].label,
        selected: false,
      });

      expect(assetTypeTab).toBeInTheDocument();

      await user.click(assetTypeTab);

      expect(assetTypeTab).toHaveAttribute('aria-selected', 'true');

      const newCommonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(newCommonTab).toBeInTheDocument();

      cleanup();
      render(<Library />);
    }
  });

  it('does not change the selected assetType tab when you select a scope tab', async () => {
    const user = userEvent.setup();
    for (let i = 0; i < assetType.length; i++) {
      const assetTypeData = assetType[i];
      const isFirstAssetTypeTab = i === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      await user.click(assetTypeTab);
      for (let j = 0; j < scope.length; j++) {
        const scopeData = scope[j];
        const isFirstScopeTab = j === 0;
        const scopeTab = screen.getByRole('tab', {
          name: scopeData.label,
          selected: isFirstScopeTab,
        });
        await user.click(scopeTab);

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
      }
    }
  });

  it('changes iframe src according to the combination of the selected tabs', async () => {
    const user = userEvent.setup();
    for (let i = 0; i < assetType.length; i++) {
      const assetTypeData = assetType[i];
      const isFirstAssetTypeTab = i === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      await user.click(assetTypeTab);
      for (let j = 0; j < scope.length; j++) {
        const scopeData = scope[j];
        const isFirstScopeTab = j === 0;
        const scopeTab = screen.getByRole('tab', {
          name: scopeData.label,
          selected: isFirstScopeTab,
        });
        await user.click(scopeTab);
        const iframe = screen.getByTitle(assetTypeData.label);
        const scopeSegment = `${isFirstScopeTab ? '' : 'common/'}`;
        const assetTypeSegment = `${assetTypeData.label.replace(' ', '_').toLowerCase()}`;
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveProperty(
          'src',
          `https://example.com/URL_LIBtree/${scopeSegment}${assetTypeSegment}`,
        );
      }
    }
  });
});
