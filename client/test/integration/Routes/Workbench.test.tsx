import { screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testLayout } from 'test/integration/Routes/routes.testUtil';
import store from 'store/store';
import { setWorkbenchServices, resetWorkbench } from 'store/workbench.slice';

globalThis.env = {
  ...globalThis.env,
  REACT_APP_URL: 'http://example.com/',
  REACT_APP_URL_BASENAME: 'basename',
};

jest.deepUnmock('util/envUtil');

const mockServices = {
  desktop: {
    name: 'Desktop',
    description: 'Virtual Desktop Environment',
    endpoint: 'tools/vnc/?foo=bar',
  },
  vscode: {
    name: 'VS Code',
    description: 'VS Code IDE',
    endpoint: 'tools/vscode',
  },
  lab: {
    name: 'Jupyter Lab',
    description: 'Jupyter Lab IDE',
    endpoint: 'lab',
  },
  notebook: {
    name: 'Jupyter Notebook',
    description: 'Jupyter Notebook',
    endpoint: '',
  },
};

async function testTool(url: string, name: string) {
  // Each tool is a card that is one link. The assertions name the role and the
  // destination, which is what has to keep working, and not the markup the
  // card happens to be built from.
  const toolLink = screen.getByRole('link', { name: new RegExp(name) });
  expect(toolLink).toBeInTheDocument();
  expect(toolLink).toHaveAttribute('href', url);
  expect(toolLink).toHaveAttribute('target', '_blank');
  expect(toolLink).toHaveAttribute('rel', 'noopener noreferrer');

  const toolHeading = within(toolLink).getByRole('heading', { level: 2 });
  expect(toolHeading).toHaveTextContent(name);
}

async function itShowsTheAddressWhenHoveringTool(name: string, url: string) {
  const toolLink = screen.getByRole('link', { name: new RegExp(name) });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  await userEvent.hover(toolLink);
  await waitFor(() => {
    expect(screen.getByRole('tooltip')).toHaveTextContent(url);
  });

  await userEvent.unhover(toolLink);
  await waitFor(() => {
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
}

const setup = async () => {
  store.dispatch(setWorkbenchServices(mockServices));
  await setupIntegrationTest('/workbench');
};

describe('Workbench', () => {
  const desktopLabel =
    'http://example.com/basename/username/tools/vnc/?foo=bar';
  const VSCodeLabel = 'http://example.com/basename/username/tools/vscode';
  const jupyterLabLabel = 'http://example.com/basename/username/lab';
  const jupyterNotebookLabel = 'http://example.com/basename/username/';

  beforeEach(async () => {
    await setup();
  });

  afterEach(async () => {
    await act(async () => {
      store.dispatch(resetWorkbench());
    });
  });

  it('renders the Workbench and Layout correctly', async () => {
    await testLayout();

    // The page title is the page's h1 now. It was an h4 before, which made
    // the document start its heading outline at level four.
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    await waitFor(() => {
      testTool(desktopLabel, 'Desktop');
    });
    await testTool(VSCodeLabel, 'VSCode');
    await testTool(jupyterLabLabel, 'JupyterLab');
    await testTool(jupyterNotebookLabel, 'Jupyter Notebook');
  });

  it('shows the tooltip when hovering over the tools', async () => {
    await itShowsTheAddressWhenHoveringTool('Desktop', desktopLabel);
    await itShowsTheAddressWhenHoveringTool('VSCode', VSCodeLabel);
    await itShowsTheAddressWhenHoveringTool('JupyterLab', jupyterLabLabel);
    await itShowsTheAddressWhenHoveringTool(
      'Jupyter Notebook',
      jupyterNotebookLabel,
    );
  });
});
