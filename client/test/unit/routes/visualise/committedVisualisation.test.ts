import type { HostServices } from '@into-cps-association/dtaas-sdk';
import { GitFileMissing } from 'extension/gitClient';
import committedReader from 'route/digitaltwins/visualise/committedVisualisation';

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));

const ASSET = {
  schemaVersion: '1.0',
  name: 'pump',
  layout: { type: 'single', panes: ['photo'] },
  substrates: {
    photo: { adapter: 'embed', source: 'https://grafana.example/d/1' },
  },
};

const SETTINGS: Record<string, string> = {
  GROUP_NAME: 'DTaaS',
  BRANCH_NAME: 'master',
  DT_DIRECTORY: 'digital_twins',
};

function sourcesWith(
  read: HostServices['git']['read'],
  settings = SETTINGS,
): Pick<HostServices, 'auth' | 'git' | 'settings'> {
  return {
    auth: {
      user: async () => ({ username: 'alice' }),
      useUser: () => ({ username: 'alice' }),
    },
    git: { read, commit: jest.fn() },
    settings: { get: <T>(key: string) => settings[key] as T | undefined },
  };
}

describe('the committed visualisation of a twin', () => {
  it("reads the file on the branch of the user's own project", async () => {
    const read = jest.fn(async () =>
      new TextEncoder().encode(JSON.stringify(ASSET)),
    );

    const asset = await committedReader(sourcesWith(read))('pump');

    expect(asset?.name).toBe('pump');
    expect(read).toHaveBeenCalledWith(
      'DTaaS/alice',
      'digital_twins/pump/visualisation.json',
      'master',
    );
  });

  it('answers none when the file is not committed', async () => {
    const read = jest.fn(async (repo: string, path: string, ref?: string) => {
      throw new GitFileMissing(repo, path, ref ?? '');
    });

    await expect(committedReader(sourcesWith(read))('pump')).resolves.toBe(
      null,
    );
  });

  it('fails on any other error, on a broken file and on an empty setting', async () => {
    const down = jest.fn(async () => {
      throw new Error('GitLab answered 502');
    });
    const broken = jest.fn(async () => new TextEncoder().encode('{"name":3}'));
    const noBranch = { ...SETTINGS, BRANCH_NAME: '' };

    await expect(committedReader(sourcesWith(down))('pump')).rejects.toThrow(
      '502',
    );
    await expect(committedReader(sourcesWith(broken))('pump')).rejects.toThrow(
      'DTaaS/alice@master:digital_twins/pump',
    );
    await expect(
      committedReader(sourcesWith(broken, noBranch))('pump'),
    ).rejects.toThrow('BRANCH_NAME');
  });
});
