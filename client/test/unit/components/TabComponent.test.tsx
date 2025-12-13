import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabComponent, constructURL } from 'components/tab/TabComponent';
import { assetType } from 'route/library/LibraryTabData';
import { createCombinedTabs, createTabs } from 'route/library/Library';

jest.mock('components/tab/TabComponent', () => ({
  __esModule: true,
  ...jest.requireActual('components/tab/TabComponent'),
}));

describe('TabComponent', () => {
  const assetTypeTabs = createTabs();
  const scopeTabs = createCombinedTabs();

  test('renders an empty tab', () => {
    const { getByText } = render(
      <TabComponent assetType={assetTypeTabs} scope={scopeTabs} />,
    );
    const emptyTab = getByText('Functions');
    expect(emptyTab).toBeInTheDocument();
    userEvent.click(emptyTab);
  });

  test('renders tabs with labels and defaults to the first tab open', async () => {
    render(<TabComponent assetType={assetTypeTabs} scope={scopeTabs} />);

    const functionsAppear = screen.getAllByText('Functions');
    expect(functionsAppear.length).toBeGreaterThan(0);

    const modelsAppear = screen.getAllByText('Models');
    expect(modelsAppear.length).toBeGreaterThan(0);

    const functionsTab = assetType.find((tab) => tab.label === 'Functions');

    if (functionsTab) {
      const isFunctionsBody = screen.getAllByText('Functions');
      expect(isFunctionsBody.length).toBeGreaterThan(0);
    }

    const clickedTab = screen.getByRole('tab', { name: 'Models' });
    await userEvent.click(clickedTab);

    const modelsTab = assetType.find((tab) => tab.label === 'Models');

    if (modelsTab) {
      const isModelsBody = screen.getAllByText(modelsTab.body);
      const modelsbodylength = isModelsBody.length;
      expect(modelsbodylength).not.toBeLessThan(0);
    }
  });

  test('changes the active tab on click', async () => {
    render(<TabComponent assetType={assetTypeTabs} scope={scopeTabs} />);
    const clickedTab = screen.getByRole('tab', { name: 'Data' });

    await userEvent.click(clickedTab);

    const dataTab = assetType.find((tab) => tab.label === 'Data');

    if (dataTab) {
      const isDataBody = screen.getAllByText(dataTab.body);
      expect(isDataBody.length).toBeGreaterThan(0);
    }

    expect(
      screen.queryByText(assetTypeTabs[0].body.props.children),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(assetTypeTabs[1].body.props.children),
    ).not.toBeInTheDocument();
  });

  test('constructs correct URLs for Iframes', () => {
    const gitlabName = 'user';
    const LIBURL = `http://localhost.com:4000/${gitlabName}/`;
    const assets = 'Digital Twins';
    const scope = 'Common';
    const expectedURL = `${LIBURL}tree/common/digital_twins`;

    expect(constructURL(assets, scope, LIBURL)).toBe(expectedURL);
  });
});
