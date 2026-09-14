import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkBench from 'route/workbench/Workbench';
import { InitRouteTests } from 'test/unit/unit.testUtil';
import { useSelector, useDispatch } from 'react-redux';
import { useWorkbenchLinkValues } from 'util/envUtil';

describe('Workbench', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: object) => unknown) =>
        selector({
          auth: { userName: 'username' },
          workbench: { status: 'succeeded', services: {} },
        }),
    );
  });

  InitRouteTests(<WorkBench />);

  it('displays the page heading', () => {
    expect(
      screen.getByRole('heading', { name: /Workbench Tools/ }),
    ).toBeInTheDocument();
  });

  it('says so when the workspace reports no tools', () => {
    // An empty workspace is a state a person meets, so the page says what is
    // happening instead of showing an empty panel. The override lasts for one
    // render, so the suite that follows still sees the three tools.
    (useWorkbenchLinkValues as jest.Mock).mockReturnValueOnce([]);

    const { unmount } = render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No tools are available yet/i)).toBeInTheDocument();
    unmount();
  });

  it('says so when a tool carries an address it will not open', () => {
    // The address comes from the deployment's configuration, so a scheme this
    // application refuses is a misconfiguration a person has to see.
    (useWorkbenchLinkValues as jest.Mock).mockReturnValueOnce([
      // eslint-disable-next-line no-script-url -- the refused URL is the subject
      { key: 'VSCODE', link: 'javascript:alert(1)' },
    ]);

    const { unmount } = render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );

    expect(screen.getByText(/cannot be opened/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /VSCode/ })).toBeNull();
    unmount();
  });

  it('follows a preview page in this tab, so the session is kept', () => {
    // A new tab starts with an empty sessionStorage, which is where the OIDC
    // session lives, so opening a page of this application in one lands on the
    // sign in page. This is the regression that made the two preview cards
    // bounce to sign in.
    (useWorkbenchLinkValues as jest.Mock).mockReturnValueOnce([
      { key: 'LIBRARY_PREVIEW', link: '/preview/library', opensInApp: true },
    ]);

    const { unmount } = render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Library Page Preview/ });
    expect(link).toHaveAttribute('href', '/preview/library');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
    unmount();
  });

  it('opens a workspace service in a new tab, though it shares this origin', () => {
    // The workbench serves its tools from this same host, so deciding by
    // origin would hand /user/lab to the router and land on Not Found.
    (useWorkbenchLinkValues as jest.Mock).mockReturnValueOnce([
      { key: 'JUPYTERLAB', link: '/user/lab' },
    ]);

    const { unmount } = render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /JupyterLab/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    unmount();
  });

  it('does not hand a full URL to the router, even when marked as a page', () => {
    (useWorkbenchLinkValues as jest.Mock).mockReturnValueOnce([
      {
        key: 'LIBRARY_PREVIEW',
        link: 'https://example.com/preview/library',
        opensInApp: true,
      },
    ]);

    const { unmount } = render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Library Page Preview/ });
    expect(link).toHaveAttribute('target', '_blank');
    unmount();
  });

  it('renders each tool as a link that opens in a new tab', () => {
    // The tools used to be icon buttons calling window.open while carrying
    // role="link". They are anchors now, so this asserts the role and not a
    // button that pretends to be one.
    const links = screen.queryAllByRole('link');

    // Without this the assertion below passes on an empty list, which is what
    // it is meant to catch.
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
