import * as React from 'react';
import {
  fireEvent,
  getDefaultNormalizer,
  render, screen, within
} from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import Library from '../../src/route/library/Library';
import { assetType, scope } from '../../src/route/library/LibraryTabData'

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
    jest.clearAllMocks();
  })

  it('renders the Library content correctly', () => {
    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    const assetTypeTablist = tablists[0];

    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');
    expect(assetTypesTabs).toHaveLength(5);

    const functionsTab = within(assetTypeTablist).getByRole('tab', { name: "Functions", selected: true });
    expect(functionsTab).toBeInTheDocument();
    const modelsTab = within(assetTypeTablist).getByRole('tab', { name: "Models", selected: false });
    expect(modelsTab).toBeInTheDocument();
    const toolsTab = within(assetTypeTablist).getByRole('tab', { name: "Tools", selected: false });
    expect(toolsTab).toBeInTheDocument();
    const dataTab = within(assetTypeTablist).getByRole('tab', { name: "Data", selected: false });
    expect(dataTab).toBeInTheDocument();
    const digitalTwinsTab = within(assetTypeTablist).getByRole('tab', { name: "Digital Twins", selected: false });
    expect(digitalTwinsTab).toBeInTheDocument();

    let i = 0;
    const functionsParagraph = screen.getByText(assetType[i++].body, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
    expect(functionsParagraph).toBeInTheDocument();
    const modelsParagraph = screen.queryByText(assetType[i++].body, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
    expect(modelsParagraph).not.toBeInTheDocument();
    const toolsParagraph = screen.queryByText(assetType[i++].body, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
    expect(toolsParagraph).not.toBeInTheDocument();
    const dataParagraph = screen.queryByText(assetType[i++].body, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
    expect(dataParagraph).not.toBeInTheDocument();
    const digitalTwinsParagraph = screen.queryByText(assetType[i++].body, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
    expect(digitalTwinsParagraph).not.toBeInTheDocument();

    const scopeTablist = tablists[1];

    const scopeTabs = within(scopeTablist).getAllByRole('tab');
    expect(scopeTabs).toHaveLength(2);

    const privateTab = within(scopeTablist).getByRole('tab', { name: "Private", selected: true });
    expect(privateTab).toBeInTheDocument();
    const commonTab = within(scopeTablist).getByRole('tab', { name: "Common", selected: false });
    expect(commonTab).toBeInTheDocument();

    const privateParagraph = screen.getByText(scope[0].body,);
    expect(privateParagraph).toBeInTheDocument();

    const commonParagraph = screen.queryByText(scope[1].body,);
    expect(commonParagraph).not.toBeInTheDocument();

    const iframe = screen.getByTitle("Functions");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty('src', 'https://example.com/URL_LIBtree/functions')
  });

  it('updates text and iframe src when Models tab is pressed', () => {
    const tablists = screen.getAllByRole('tablist');
    const assetTypeTablist = tablists[0];
    const modelsTab = within(assetTypeTablist).getByRole('tab', { name: 'Models', selected: false });
    expect(modelsTab).toBeInTheDocument();

    const modelsParagraph = screen.queryByText(assetType[1].body);
    expect(modelsParagraph).not.toBeInTheDocument();

    fireEvent.click(modelsTab);
    const modelsTabAfterClick = within(assetTypeTablist).getByRole('tab', { name: 'Models', selected: true });
    expect(modelsTabAfterClick).toBeInTheDocument();

    const modelsParagraphAfterClick = screen.getByText(assetType[1].body);
    expect(modelsParagraphAfterClick).toBeInTheDocument();

    const iframe = screen.getByTitle("Models");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty('src', 'https://example.com/URL_LIBtree/models')
  });

  it('updates text and iframe src according to which tabs are pressed', () => {
    const tablists = screen.getAllByRole('tablist');
    const assetTypeTablist = tablists[0];
    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');
    for (let i = 1; i < assetTypesTabs.length; i++) {
      const tabLabel = assetType[i].label;
      const tabBody = assetType[i].body;

      const tab = within(assetTypeTablist).getByRole('tab', { name: tabLabel, selected: false });
      expect(tab).toBeInTheDocument();

      const modelsParagraph = screen.queryByText(tabBody, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
      expect(modelsParagraph).not.toBeInTheDocument();

      fireEvent.click(tab);
      const tabAfterClick = within(assetTypeTablist).getByRole('tab', { name: tabLabel, selected: true });
      expect(tabAfterClick).toBeInTheDocument();

      const tabParagraphAfterClick = screen.getByText(tabBody, { normalizer: getDefaultNormalizer({ trim: false, collapseWhitespace: false }) });
      expect(tabParagraphAfterClick).toBeInTheDocument();

      const iframe = screen.getByTitle(tabLabel);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveProperty('src', `https://example.com/URL_LIBtree/${tabLabel.replace(" ", "_").toLowerCase()}`);
    };
  });
});