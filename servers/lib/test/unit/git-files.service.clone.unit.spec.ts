import { describe, it, expect, jest, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import Config from 'src/config/config.service';

const clone = jest.fn<(options: { dir: string }) => Promise<void>>();
jest.unstable_mockModule('isomorphic-git', () => ({ clone }));

const { default: GitFilesService } =
  await import('src/files/git/git-files.service');

describe('GitFilesService clone', () => {
  const dataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'libms-git-'));

  afterEach(() => {
    fs.rmSync(dataPath, { recursive: true, force: true });
  });

  it('should create the work tree directory before cloning', async () => {
    // Arrange
    const config = {
      getLocalPath: () => dataPath,
      getGitRepos: () => [
        { user1: { 'repo-url': 'https://gitlab.com/dtaas/user1.git' } },
      ],
    } as unknown as Config;
    const dirExistedAtClone: boolean[] = [];
    clone.mockImplementation(async ({ dir }) => {
      dirExistedAtClone.push(fs.existsSync(dir));
    });

    // Act
    await new GitFilesService(config).init();

    // Assert
    expect(clone).toHaveBeenCalledTimes(1);
    expect(dirExistedAtClone).toEqual([true]);
  });
});
