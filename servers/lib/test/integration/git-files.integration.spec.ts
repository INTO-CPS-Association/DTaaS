
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import GitFilesService from '../../src/files/git/git-files.service';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import * as os from 'os';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);               // █ NOTE 0┆0 0 █: Converts (URL of the Current module) to a file path;
const __dirname = path.dirname(__filename);                      // █ NOTE 0┆0 1 █: Gets the directory containing *this* test file. ES modules don't provide it, so manually define it;
dotenv.config();
//
class DummyConfigService {                                       // █ NOTE 1┆0 0 █: Class that acts as a minimal stub of our real configuration service.;
    private config: any;                                         // █            █     Point is, not loading full production, but create simple version for testing;
    constructor(configData: any) { this.config = configData; }
    getLocalPath(): string { return this.config['local-path']; } // █ NOTE 1┆0 1 █: implements the 'getLocalPath' method necessary for the GitFilesService;
    getGitRepos(): any[] { return this.config['git-repos']; }    // █ NOTE 1┆0 2 █: implements the 'getGitRepos'  method necessary for the GitFilesService;
    isDryRun(): boolean { return false; }                        // █ NOTE 1┆0 3 █: implements the 'isDryRun'     method necessary for the GitFilesService;
}
//

describe('GitFilesService Integration Test Using Actual Config', () => { // █ NOTE 2┆0 0 █: Starts Creating test suite with descriptive title.;
    let tempDir: string;                                         // █ NOTE 2┆0 1 █: Stores the test directory;
    let gitFilesService: GitFilesService;                        // █ NOTE 2┆0 2 █: This is the instance being tested;
    let configService: DummyConfigService;                       // █ NOTE 2┆0 3 █: Holds test configuration;
    //

    beforeAll(async () => {                                      // █ NOTE 2┆0 4 █: Start of, setting up test environment, by create temporary directory for cloning;
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libms-test-')); // █ NOTE 2┆0 5 █: Instantiating The Temporary directory for testing;
        console.log(`Temporary directory for test: ${tempDir}`);
        //

        const configFilePath = path.join(__dirname, '../../libms.yaml'); // █ NOTE 2┆0 6 █: Starts Creating test suite with descriptive title by loading .yaml file.;
        const fileContents = await fs.readFile(configFilePath, 'utf8');
        const configData = yaml.load(fileContents) as any;
        //

        configData['local-path'] = tempDir;                      // █ NOTE 2┆0 7 █: Override the local-path with the temporary directory.;
        //

        //                   accesses the 'http-token' inside 'user1'
        //                   ────────────────────────┬───────────────
        //                                           ╎
        // array object   access first object   the value under 'user1' key
        // ───┬────────   ──────┬────────────   ──┬────────────────────────
        //    ╎                 ╎     ┌╌╌╌╌╌╌╌╌╌╌╌┘  ╎
        //────┴───┐            ┌┴┐ ┌──┴──┐  ┌────────┴─┐
        configData['git-repos'][0]['user1']['http-token'];
        configService = new DummyConfigService(configData);
        gitFilesService = new GitFilesService(configService as any);
        (gitFilesService as any).localFilesService = {            //█ NOTE 2┆0 8 █: Inject a dummy LocalFilesService if needed.with dummy config.Using "as any" to bypass full interface requirements.;
            listDirectory: async (_p: string) => ({}),
            readFile: async (_p: string) => ({}),
        };
    });
    //


    afterAll(async () => {                                       // █ NOTE 3┆0 0 █:  Remove the temporary directory after tests;
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Test finished.`);
        console.log(`Removed temporary directory: ${tempDir}`);
    });
    //

    it('should clone all configured repositories into the temporary directory', async () => { // █ NOTE 4┆0 0 █:  The actual test;
        await gitFilesService.init();                            // █ NOTE 4┆0 1 █:  call to trigger the repo cloning;
        const repoKeys = ['user1', 'user2', 'common'];
        for (const key of repoKeys) {                            // █ NOTE 4┆0 2 █:  loop to check that each expected repo directory exists;
            const cloneDir = path.join(tempDir, key);
            await expect(fs.access(cloneDir)).resolves.not.toThrow();
            const files = await fs.readdir(cloneDir);
            expect(files.length).toBeGreaterThan(0);
        }
    });
});
