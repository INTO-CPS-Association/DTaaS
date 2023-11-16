import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabComponent, constructURL } from 'components/tab/TabComponent';
// import { TabData } from 'components/tab/subcomponents/TabRender';
import { assetType } from 'route/library/LibraryTabData';
// import { useURLforLIB } from 'util/envUtil';
// import { Typography } from '@mui/material';
// import Iframe from 'react-iframe';

import { tabsData, combinedData} from "route/library/Library";

describe('TabComponent', () => {
  // const LIBurl = useURLforLIB();


  // const assetTypeTabs: TabData[] = assetType.map((tab) => ({
  //   label: tab.label,
  //   body: (
  //     <>
  //       <Typography variant="body1">{tab.body}</Typography>
  //     </>
  //   ),
  // }));

  // const scopeTabs: TabData[][] = assetType.map((tab) =>
  //   scope.map((subtab) => ({
  //     label: `${subtab.label}`,
  //     body: (
  //       <>
  //         <Typography variant="body1">{subtab.body}</Typography>
  //         <Iframe
  //           title={`${tab.label}`}
  //           url={constructURL(tab.label, subtab.label, LIBurl)}
  //         />
  //       </>
  //     ),
  //   }))
  // );




  test('renders an empty tab', () => {
    const { getByText } = render(
      <TabComponent assetType={tabsData} scope={combinedData} />
    );
    const emptyTab = getByText('Functions');
    expect(emptyTab).toBeInTheDocument();
    userEvent.click(emptyTab);
  });

  test('renders tabs with labels and defaults to the first tab open', async () => {
    render(<TabComponent assetType={tabsData} scope={combinedData} />);

    // Check if tab labels are rendered
    const functionsAppear = screen.getAllByText('Functions');
    expect(functionsAppear.length).toBeGreaterThan(0);

    const modelsAppear = screen.getAllByText('Models');
    expect(modelsAppear.length).toBeGreaterThan(0);

    const functionsTab = assetType.find((tab) => tab.label === 'Functions');

    if (functionsTab) {
      const isFunctionsBody = screen.getAllByText('Functions');
      expect(isFunctionsBody.length).toBeGreaterThan(0);
    }

    // Click on the 'models' tab
    const clickedTab = screen.getByRole('tab', { name: 'Models' });
    await userEvent.click(clickedTab);

    // Check if the content of 'models' tab is now visible

    const modelsTab = assetType.find((tab) => tab.label === 'Models');

    if (modelsTab) {
      const isModelsBody = screen.getAllByText(modelsTab.body);
      expect(isModelsBody.length).toBeGreaterThan(0);
    }
  });

  test('changes the active tab on click', async () => {
    render(<TabComponent assetType={tabsData} scope={combinedData} />);
    const clickedTab = screen.getByRole('tab', { name: 'Data' });

    await userEvent.click(clickedTab);
    // Check if the tab is open after the click

    const dataTab = assetType.find((tab) => tab.label === 'Data');

    if (dataTab) {
      const isDataBody = screen.getAllByText(dataTab.body);
      expect(isDataBody.length).toBeGreaterThan(0);
    }

    expect(
      screen.queryByText(tabsData[0].body.props.children)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(tabsData[1].body.props.children)
    ).not.toBeInTheDocument();
  });

  test('constructs correct URLs for Iframes', () => {
    // Example URL construction
    const githubName = 'caesarv16';
    const LIBURL = `http://localhost.com:4000/${githubName}/`;
    const tabLabel = 'Functions';
    const subTabLabel = 'Common';
    const expectedURL = `${LIBURL}tree/functions`;

    // Check if the function constructs the correct URL
    expect(constructURL(tabLabel, subTabLabel, LIBURL)).toBe(expectedURL);
  });
});
