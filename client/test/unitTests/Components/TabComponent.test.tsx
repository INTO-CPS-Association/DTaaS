import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabComponent, constructURL } from 'components/tab/TabComponent';
// import { constructURL } from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { assetType } from 'route/library/LibraryTabData';

describe('TabComponent', () => {
  test('renders an empty tab', () => {
    const assetTypeTabs: TabData[] = [];
    const scopeTabs: TabData[] = [];
    const { getByText } = render(<TabComponent assetType={assetTypeTabs} scope={scopeTabs} />);
    const emptyTab = getByText('Functions');
    expect(emptyTab).toBeInTheDocument();
    userEvent.click(emptyTab);
  });

  test('renders tabs with labels and defaults to the first tab open', () => {
    const tabs = [
      { label: assetType[0].label, body: <div>{assetType[0].body}</div> },
      { label: assetType[1].label, body: <div>{assetType[1].body}</div> },
    ];
  
    render(<TabComponent assetType={tabs} scope={[]} />);
  
    // Check if tab labels are rendered
    expect(screen.getAllByText('Functions')).toBeInTheDocument()
    expect(screen.getAllByText('Models')).toBeInTheDocument()
  
    // The first tab should be open by default
    expect(screen.getAllByText('The functions responsible')).toBeInTheDocument()
  
    // Click on the 'models' tab
    userEvent.click(screen.getByText('Models'));
  
    // Check if the content of 'models' tab is now visible
    expect(screen.getAllByText('The model assets')).toBeInTheDocument()
    expect(screen.queryAllByText('The functions responsible')).not.toBeInTheDocument()
  });

  test('changes the active tab on click', async () => {
    const tabs = [
      { label: assetType[0].label, body: <div>{assetType[0].body}</div>},
      { label: assetType[1].label, body: <div>{assetType[1].body}</div>},
      { label: assetType[2].label, body: <div>{assetType[2].body}</div>}
    ];
  
    render(<TabComponent assetType={tabs} scope={[]} />);
    const tab = screen.getByRole('Tab', { name: 'Models' });
  
    await userEvent.click(tab);
    // Check if the second tab is open after the click
  
    const isModelsBody = screen.getAllByText('models body 2');
    expect(isModelsBody.length).toBeGreaterThan(0);
  
    expect(screen.queryByText('functions body 2')).not.toBeInTheDocument();
    expect(screen.queryByText('tools body 2')).not.toBeInTheDocument();
  });

  test('constructs correct URLs for Iframes', () => {
    // Example URL construction
    const githubName = 'caesarv16';
    const LIBURL = `http://localhost.com:4000/${githubName}/`;
    const tabLabel = '';
    const subTabLabel = 'Common';
    const expectedURL = `${LIBURL}tree/common/`;

    // Check if the function constructs the correct URL
    expect(constructURL(tabLabel, subTabLabel, LIBURL)).toBe(expectedURL);
  });
});
