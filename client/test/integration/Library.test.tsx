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

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
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
    const userMock = {
      profile: {
        profile: 'example/username',
      },
      access_token: 'example_token',
    };

    (useAuth as jest.Mock).mockReturnValue({ user: userMock });

    render(<Library></Library>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('renders the Library content correctly', () => {
    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    const assetTypeTablist = tablists[0];

    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');
    expect(assetTypesTabs).toHaveLength(5);

    const functionsTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Functions',
      selected: true,
    });
    expect(functionsTab).toBeInTheDocument();
    const modelsTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Models',
      selected: false,
    });
    expect(modelsTab).toBeInTheDocument();
    const toolsTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Tools',
      selected: false,
    });
    expect(toolsTab).toBeInTheDocument();
    const dataTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Data',
      selected: false,
    });
    expect(dataTab).toBeInTheDocument();
    const digitalTwinsTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Digital Twins',
      selected: false,
    });
    expect(digitalTwinsTab).toBeInTheDocument();

    let i = 0;
    const functionsParagraph = screen.getByText(assetType[i++].body, {
      normalizer,
    });
    expect(functionsParagraph).toBeInTheDocument();
    const modelsParagraph = screen.queryByText(assetType[i++].body, {
      normalizer,
    });
    expect(modelsParagraph).not.toBeInTheDocument();
    const toolsParagraph = screen.queryByText(assetType[i++].body, {
      normalizer,
    });
    expect(toolsParagraph).not.toBeInTheDocument();
    const dataParagraph = screen.queryByText(assetType[i++].body, {
      normalizer,
    });
    expect(dataParagraph).not.toBeInTheDocument();
    const digitalTwinsParagraph = screen.queryByText(assetType[i++].body, {
      normalizer,
    });
    expect(digitalTwinsParagraph).not.toBeInTheDocument();

    const scopeTablist = tablists[1];

    const scopeTabs = within(scopeTablist).getAllByRole('tab');
    expect(scopeTabs).toHaveLength(2);

    const privateTab = within(scopeTablist).getByRole('tab', {
      name: 'Private',
      selected: true,
    });
    expect(privateTab).toBeInTheDocument();
    const commonTab = within(scopeTablist).getByRole('tab', {
      name: 'Common',
      selected: false,
    });
    expect(commonTab).toBeInTheDocument();

    i = 0;
    const privateParagraph = screen.getByText(scope[i++].body, {
      normalizer,
    });
    expect(privateParagraph).toBeInTheDocument();

    const commonParagraph = screen.queryByText(scope[i++].body, {
      normalizer,
    });
    expect(commonParagraph).not.toBeInTheDocument();

    const iframe = screen.getByTitle('Functions');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty(
      'src',
      'https://example.com/URL_LIBtree/functions',
    );
  });

  it('updates text and iframe src when Models tab is selected', () => {
    const tablists = screen.getAllByRole('tablist');
    const assetTypeTablist = tablists[0];
    const modelsTab = within(assetTypeTablist).getByRole('tab', {
      name: 'Models',
      selected: false,
    });
    expect(modelsTab).toBeInTheDocument();

    const modelsParagraph = screen.queryByText(assetType[1].body);
    expect(modelsParagraph).not.toBeInTheDocument();

    fireEvent.click(modelsTab);
    const modelsTabAfterClick = within(assetTypeTablist).getByRole('tab', {
      name: 'Models',
      selected: true,
    });
    expect(modelsTabAfterClick).toBeInTheDocument();

    const modelsParagraphAfterClick = screen.getByText(assetType[1].body);
    expect(modelsParagraphAfterClick).toBeInTheDocument();

    const iframe = screen.getByTitle('Models');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty(
      'src',
      'https://example.com/URL_LIBtree/models',
    );
  });

  it('does not update text and iframe src when clicking default assetType tab', () => {
    const tablists = screen.getAllByRole('tablist');
    const assetTypeTablist = tablists[0];

    const tabLabel = assetType[0].label;
    const tabBody = assetType[0].body;

    const tab = within(assetTypeTablist).getByRole('tab', {
      name: tabLabel,
      selected: true,
    });
    expect(tab).toBeInTheDocument();

    const tabParagraph = screen.queryByText(tabBody, {
      normalizer,
    });
    expect(tabParagraph).toBeInTheDocument();

    fireEvent.click(tab);
    const tabAfterClick = within(assetTypeTablist).getByRole('tab', {
      name: tabLabel,
      selected: true,
    });
    expect(tabAfterClick).toBeInTheDocument();
    expect(tabAfterClick).toBe(tab);

    const tabParagraphAfterClick = screen.getByText(tabBody, {
      normalizer,
    });
    expect(tabParagraphAfterClick).toBeInTheDocument();
    expect(tabParagraphAfterClick).toBe(tabParagraph);
  });

  it('updates text and iframe src according to which assetType tab is selected', () => {
    const tablists = screen.getAllByRole('tablist');
    const assetTypeTablist = tablists[0];
    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');

    const spyOnClick = jest.spyOn(fireEvent, 'click');
    for (let i = 1; i < assetTypesTabs.length; i++) {
      const tabLabel = assetType[i].label;
      const tabBody = assetType[i].body;

      const tab = within(assetTypeTablist).getByRole('tab', {
        name: tabLabel,
        selected: false,
      });
      expect(tab).toBeInTheDocument();

      const tabParagraph = screen.queryByText(tabBody, {
        normalizer,
      });
      expect(tabParagraph).not.toBeInTheDocument();

      fireEvent.click(tab);
      const tabAfterClick = within(assetTypeTablist).getByRole('tab', {
        name: tabLabel,
        selected: true,
      });
      expect(tabAfterClick).toBeInTheDocument();

      const tabParagraphAfterClick = screen.getByText(tabBody, {
        normalizer,
      });
      expect(tabParagraphAfterClick).toBeInTheDocument();

      const iframe = screen.getByTitle(tabLabel);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveProperty(
        'src',
        `https://example.com/URL_LIBtree/${tabLabel.replace(' ', '_').toLowerCase()}`,
      );
    }
    expect(spyOnClick).toHaveBeenCalled();
  });

  it('does not update text and iframe src when clicking default scope tab', () => {
    const tablists = screen.getAllByRole('tablist');
    const scopeTablist = tablists[1];

    const tabLabel = scope[0].label;
    const tabBody = scope[0].body;

    const tab = within(scopeTablist).getByRole('tab', {
      name: tabLabel,
      selected: true,
    });
    expect(tab).toBeInTheDocument();

    const tabParagraph = screen.queryByText(tabBody, {
      normalizer,
    });
    expect(tabParagraph).toBeInTheDocument();

    fireEvent.click(tab);
    const tabAfterClick = within(scopeTablist).getByRole('tab', {
      name: tabLabel,
      selected: true,
    });
    expect(tabAfterClick).toBeInTheDocument();
    expect(tab).toBe(tabAfterClick);

    const tabParagraphAfterClick = screen.getByText(tabBody, {
      normalizer,
    });
    expect(tabParagraphAfterClick).toBeInTheDocument();
    expect(tabParagraphAfterClick).toBe(tabParagraph);
  });

  it('updates text according to which scope tab is selected', () => {
    const tablists = screen.getAllByRole('tablist');
    const scopeTablist = tablists[1];
    const scopesTabs = within(scopeTablist).getAllByRole('tab');

    const spyOnClick = jest.spyOn(fireEvent, 'click');
    for (let i = 1; i < scopesTabs.length; i++) {
      const tabLabel = scope[i].label;
      const tabBody = scope[i].body;

      const tab = within(scopeTablist).getByRole('tab', {
        name: tabLabel,
        selected: false,
      });
      expect(tab).toBeInTheDocument();

      const tabParagraph = screen.queryByText(tabBody, {
        normalizer,
      });
      expect(tabParagraph).not.toBeInTheDocument();

      fireEvent.click(tab);
      const tabAfterClick = within(scopeTablist).getByRole('tab', {
        name: tabLabel,
        selected: true,
      });
      expect(tabAfterClick).toBeInTheDocument();

      const tabParagraphAfterClick = screen.getByText(tabBody, {
        normalizer,
      });
      expect(tabParagraphAfterClick).toBeInTheDocument();
    }
    expect(spyOnClick).toHaveBeenCalled();
  });

  it('selects the correct tabs when clicking on them', () => {
    const spyOnClick = jest.spyOn(fireEvent, 'click');
    const tablists = screen.getAllByRole('tablist');

    const assetTypeTablist = tablists[0];
    const scopeTablist = tablists[1];

    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');
    const scopeTabs = within(scopeTablist).getAllByRole('tab');

    // Select scope first, then assetType
    fireEvent.click(scopeTabs[1]);
    fireEvent.click(assetTypesTabs[2]);

    expect(spyOnClick).toHaveBeenCalledTimes(2);

    expect(assetTypesTabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(scopeTabs[1]).toHaveAttribute('aria-selected', 'true');

    // Select assetType, then scope
    fireEvent.click(assetTypesTabs[0]);
    fireEvent.click(scopeTabs[1]);

    expect(spyOnClick).toHaveBeenCalledTimes(4);

    expect(assetTypesTabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(scopeTabs[1]).toHaveAttribute('aria-selected', 'true');
  });
});
