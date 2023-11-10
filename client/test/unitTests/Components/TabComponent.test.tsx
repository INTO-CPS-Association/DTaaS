import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabComponent, constructURL } from 'components/tab/TabComponent';
// import { constructURL } from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';

describe('TabComponent', () => {
  test('renders an empty tab', () => {
    const tabs: TabData[] = [];
    render(<TabComponent tabs={tabs} />);
    // Check if the empty tab renders without errors
    expect(true).toBeTruthy();
  });

  test('renders tabs with labels and defaults to the first tab open', () => {
    const tabs = [
      { label: 'functions', body: <div>functions body 1</div> },
      { label: 'models', body: <div>models body 1</div> },
    ];
    render(<TabComponent tabs={tabs} />);

    // Check if tab labels are rendered

    /* We get all the appereances of functions or models in the html
     * and if the Array resulting of gathering up these information
     * is greater tahn 0 it means it is at least once in the Html
     */

    const isFunctions = screen.getAllByText('functions');
    expect(isFunctions.length).toBeGreaterThan(0);

    const isModels = screen.getAllByText('models');
    expect(isModels.length).toBeGreaterThan(0);

    // expect(screen.getByText('functions')).toBeInTheDocument();
    // expect(screen.getByText('models')).toBeInTheDocument();

    // The first tab should be open by default

    const isFunctionsBody = screen.getAllByText('functions body 1');
    expect(isFunctionsBody.length).toBeGreaterThan(0);

    // expect(screen.getByText('functions body 1')).toBeInTheDocument();
    expect(screen.queryByText('models body 1')).not.toBeInTheDocument();
  });

  test('changes the active tab on click', async () => {
    const tabs = [
      { label: 'functions', body: <div>functions body 2</div> },
      { label: 'models', body: <div>models body 2</div> },
      { label: 'tools', body: <div>tools body 2</div> },
    ];
    render(<TabComponent tabs={tabs} />);
    const tab = screen.getByRole('tab', { name: 'models' });

    await userEvent.click(tab);
    // Check if the second tab is open after the click

    /* We get all the appereances of models body in the html
     * and if the Array resulting of gathering up these information
     * is greater tahn 0 it means it is at least once in the Html
     */

    const isModelsBody = screen.getAllByText('models body 2');
    expect(isModelsBody.length).toBeGreaterThan(0);

    expect(screen.queryByText('functions body 2')).not.toBeInTheDocument();
    // expect(screen.getByText('models body 2')).toBeInTheDocument();
    expect(screen.queryByText('tools body 2')).not.toBeInTheDocument();
  });

  test('constructs correct URLs for Iframes', () => {
    // Example URL construction
    const githubName = 'user1';
    const LIBURL = `http://localhost.com:4000/${githubName}`;
    const tabLabel = 'functions';
    const subTabLabel = 'Common';
    const expectedURL = `${LIBURL}/tree/common/`;

    // Check if the function constructs the correct URL
    expect(constructURL(tabLabel, subTabLabel, LIBURL)).toBe(expectedURL);
  });
});
