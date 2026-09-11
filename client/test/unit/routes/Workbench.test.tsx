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
