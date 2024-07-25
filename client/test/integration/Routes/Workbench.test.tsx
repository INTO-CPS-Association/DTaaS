import * as React from 'react';
import { screen, within } from '@testing-library/react';
import Workbench from 'route/workbench/Workbench';
import {
  itShowsTheTooltipWhenHoveringButton,
  setupIntegrationTest,
  testLayout,
} from '../integrationTestUtils';

window.env = {
  ...window.env,
  REACT_APP_URL: 'http://example.com/',
  REACT_APP_URL_BASENAME: 'basename',
  REACT_APP_WORKBENCHLINK_VNCDESKTOP: '/tools/vnc/?password=vncpassword',
  REACT_APP_WORKBENCHLINK_VSCODE: '/tools/vscode/',
  REACT_APP_WORKBENCHLINK_JUPYTERLAB: '/lab',
  REACT_APP_WORKBENCHLINK_JUPYTERNOTEBOOK: '',
};

jest.deepUnmock('util/envUtil');
const setup = () => setupIntegrationTest(<Workbench />);

async function testTool(toolTipText: string, name: string) {
  const toolDiv = screen.getByLabelText(toolTipText);
  expect(toolDiv).toBeInTheDocument();
  const toolHeading = within(toolDiv).getByRole('heading', { level: 6 });
  expect(toolHeading).toBeInTheDocument();
  expect(toolHeading).toHaveTextContent(name);
  const toolButton = within(toolDiv).getByTitle(`${name}-btn`);
  expect(toolButton).toBeInTheDocument();
  await itShowsTheTooltipWhenHoveringButton(toolTipText);
}

describe('Workbench', () => {
  beforeEach(() => {
    setup();
  });

  it('renders the Workbench and Layout correctly', async () => {
    await testLayout();

    const mainHeading = screen.getByRole('heading', { level: 4 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    const desktopLabel =
      'http://example.com/basename/username/tools/vnc/?password=vncpassword';
    await testTool(desktopLabel, 'Desktop');

    const VSCodeLabel = 'http://example.com/basename/username/tools/vscode';
    await testTool(VSCodeLabel, 'VSCode');

    const jupyterLabLabel = 'http://example.com/basename/username/lab';
    await testTool(jupyterLabLabel, 'JupyterLab');

    const jupyterNotebookLabel = 'http://example.com/basename/username/';
    await testTool(jupyterNotebookLabel, 'Jupyter Notebook');
  }, 7000);
});
