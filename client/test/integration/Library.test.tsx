import * as React from 'react';
import { fireEvent, screen, within, cleanup } from '@testing-library/react';
import Library from '../../src/route/library/Library';
import { assetType, scope } from '../../src/route/library/LibraryTabData';
import {
  normalizer,
  renderWithMemoryRouter,
  testLayout,
  closestDiv,
  itShowsTheParagraphOfToTheSelectedTab,
  setupIntegrationTest,
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

describe('Library', () => {
  beforeEach(() => {
    setupIntegrationTest(<Library />);
  });

  it('renders the Library and Layout correctly', () => {
    testLayout();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    // The div of the assetType (Functions, Models, etc.) tabs
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

  itShowsTheParagraphOfToTheSelectedTab([assetType, scope]);

  it('selects the first scope tab when you select an assetType tab', () => {
    // Starting from 1 as the first tab is already selected so we won't need to click it
    assetType.slice(1, -1).forEach((assetTypeData) => {
      const commonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(commonTab).toBeInTheDocument();

      fireEvent.click(commonTab);

      expect(commonTab).toHaveAttribute('aria-selected', 'true');

      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: false,
      });

      expect(assetTypeTab).toBeInTheDocument();

      fireEvent.click(assetTypeTab);

      expect(assetTypeTab).toHaveAttribute('aria-selected', 'true');

      const newCommonTab = screen.getByRole('tab', {
        name: 'Common',
        selected: false,
      });
      expect(newCommonTab).toBeInTheDocument();

      cleanup();
      renderWithMemoryRouter(<Library />);
    });
  });

  it('does not change the selected assetType tab when you select a scope tab', () => {
    assetType.forEach((assetTypeData, assetTypeIndex) => {
      const isFirstAssetTypeTab = assetTypeIndex === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      fireEvent.click(assetTypeTab);
      scope.forEach((scopeData, scopeIndex) => {
        const isFirstScopeTab = scopeIndex === 0;
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
    assetType.forEach((assetTypeData, assetTypeIndex) => {
      const isFirstAssetTypeTab = assetTypeIndex === 0;
      const assetTypeTab = screen.getByRole('tab', {
        name: assetTypeData.label,
        selected: isFirstAssetTypeTab,
      });
      fireEvent.click(assetTypeTab);
      scope.forEach((scopeData, scopeIndex) => {
        const isFirstScopeTab = scopeIndex === 0;
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
    });
  });
});
