import { act, fireEvent, render, screen, within } from '@testing-library/react';
import VisualiseTab from 'route/digitaltwins/visualise/VisualiseTab';

let mockListFails = false;
const mockGitReads: string[] = [];

jest.mock('extension/extensionHost', () => {
  const { fakeHostServices } = jest.requireActual(
    '@into-cps-association/dtaas-sdk/testing',
  );
  const { GitFileMissing } = jest.requireActual('extension/gitClient');
  const GitSignInNeeded = jest.requireActual(
    'extension/gitSignInNeeded',
  ).default;
  const asset = {
    schemaVersion: '1.0',
    name: 'junction-7',
    layout: { type: 'single', panes: ['photo'] },
    substrates: {
      photo: { adapter: 'embed', source: 'https://grafana.example/d/1' },
    },
  };
  // The workspace lists the twins, and GitLab holds what is committed. The
  // workspace copy of mass-spring is never committed, so it is not drawn.
  const host = fakeHostServices({
    files: {
      'digital_twins/junction7/main.sh': 'echo run',
      'digital_twins/mass-spring/main.sh': 'echo run',
      'digital_twins/mass-spring/visualisation.json': JSON.stringify(asset),
      'digital_twins/broken/main.sh': 'echo run',
      'digital_twins/slow/main.sh': 'echo run',
      'digital_twins/expired/main.sh': 'echo run',
    },
    settings: {
      GROUP_NAME: 'DTaaS',
      BRANCH_NAME: 'master',
      DT_DIRECTORY: 'digital_twins',
    },
  });
  const committed: Record<string, string> = {
    'DTaaS/user@master:digital_twins/junction7/visualisation.json':
      JSON.stringify(asset),
    'DTaaS/user@master:digital_twins/broken/visualisation.json': '{"name": 3}',
  };
  const git = {
    ...host.git,
    read: (repo: string, path: string, ref: string) => {
      mockGitReads.push(`${repo}@${ref}:${path}`);
      if (path.includes('/slow/')) return new Promise(jest.fn());
      if (path.includes('/expired/')) {
        return Promise.reject(new GitSignInNeeded(repo));
      }
      const text = committed[`${repo}@${ref}:${path}`];
      return text === undefined
        ? Promise.reject(new GitFileMissing(repo, path, ref))
        : Promise.resolve(new TextEncoder().encode(text));
    },
  };
  // A listing that fails on demand.
  const contents = {
    ...host.contents,
    list: (path: string) =>
      mockListFails
        ? Promise.reject(new Error('HTTP 500 at /secret/server/path'))
        : host.contents.list(path),
  };
  return { sharedServices: { ...host, contents, git } };
});

async function choose(twin: string) {
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox'));
  });
  await act(async () => {
    fireEvent.click(within(screen.getByRole('listbox')).getByText(twin));
  });
}

describe('the Visualise tab', () => {
  it('lists the twins in the library', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'broken',
      'expired',
      'junction7',
      'mass-spring',
      'slow',
    ]);
  });

  it('draws a twin from the visualisation.json committed in GitLab', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('junction7');

    expect(
      await screen.findByRole('region', { name: 'photo' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live' })).toBeInTheDocument();
    expect(mockGitReads).toContain(
      'DTaaS/user@master:digital_twins/junction7/visualisation.json',
    );
  });

  it('says so when a twin has no committed visualisation yet', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('mass-spring');

    expect(
      await screen.findByText(/has no visualisation.json committed/),
    ).toBeInTheDocument();
  });

  it('shows a plain sentence when the visualisation cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('broken');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The visualisation could not be read.',
    );
    expect(warn).toHaveBeenCalledWith(
      'The visualisation could not be read.',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it('asks to sign in again when GitLab refuses the token', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('expired');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your GitLab session has ended. Sign in again to see this twin.',
    );
    warn.mockRestore();
  });

  it('shows a spinner while the visualisation is on its way', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('slow');

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('keeps the detail of a failed listing out of the page', async () => {
    mockListFails = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      render(<VisualiseTab />);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The digital twins could not be listed.',
    );
    expect(screen.queryByText(/secret/)).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'The digital twins could not be listed.',
      expect.any(Error),
    );
    warn.mockRestore();
    mockListFails = false;
  });
});
