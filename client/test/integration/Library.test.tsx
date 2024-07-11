import * as React from 'react';
import {
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
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
    const toolbar = screen.getByTestId('toolbar');
    expect(toolbar).toBeInTheDocument();
    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
    const menu = screen.getByTestId('menu');
    expect(menu).toBeInTheDocument();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    const tablistsData = [assetType, scope];
    tablists.forEach((tablist, i) => {
      tablistsData[i].forEach((tabData, j) => {
        const isFirstTab = j === 0;
        const tab = within(tablist).getByRole('tab', {
          name: tabData.label,
          selected: isFirstTab,
        });
        expect(tab).toBeInTheDocument();

        const tabParagraph = screen.queryByText(tabData.body, {
          normalizer,
        });

        if (isFirstTab) {
          expect(tabParagraph).toBeInTheDocument();
        } else {
          expect(tabParagraph).not.toBeInTheDocument();
        }
      });
    });

    const firstAssetTypeLabel = assetType[0].label;
    const iframe = screen.getByTitle(firstAssetTypeLabel);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty(
      'src',
      `https://example.com/URL_LIBtree/${firstAssetTypeLabel.replace(' ', '_').toLowerCase()}`,
    );
  });

  it('shows the paragraph correlating to the tab that is selected', () => {
    const tablists = screen.getAllByRole('tablist');
    const tablistsData = [assetType, scope];
    tablists.forEach((_, i) => {
      tablistsData[i].forEach((tabData, j) => {
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
      });
    });
  });

  it('does not change the selected assetType tab when you select a scope tab', () => {
    assetType.forEach((assetTypeData, i) => {
      const isFirstAssetTypeTab = i === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      fireEvent.click(assetTypeTab);
      scope.forEach((scopeData, j) => {
        const isFirstScopeTab = j === 0;
        const scopeTab = screen.getByRole('tab', {
          name: scopeData.label,
          selected: isFirstScopeTab,
        });
        fireEvent.click(scopeTab);

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
      });
    });
  });

  it('changes iframe src according to the combination of the selected tabs', () => {
    (assetType.forEach((assetTypeData, i) => {
      const isFirstAssetTypeTab = i === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      fireEvent.click(assetTypeTab);
      scope.forEach((scopeData, j) => {
        const isFirstScopeTab = j === 0;
        const scopeTab = screen.getByRole('tab', {
          name: scopeData.label,
          selected: isFirstScopeTab,
        });
        fireEvent.click(scopeTab);
        const iframe = screen.getByTitle(assetTypeData.label);
        const scopeSegment = `${isFirstScopeTab ? '' : 'common/'}`;
        const assetTypeSegment = `${assetTypeData.label.replace(' ', '_').toLowerCase()}`;
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveProperty(
          'src',
          `https://example.com/URL_LIBtree/${scopeSegment}${assetTypeSegment}`,
        );
      });
    }));
  });
});
