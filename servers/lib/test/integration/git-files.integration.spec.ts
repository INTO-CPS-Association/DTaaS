import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import GitFilesService from '../../src/files/git/git-files.service';
import { GitRepo } from 'src/config/config.model';
import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as os from 'os';
import { ConsoleLogger } from '../../src/util/logger';

class DummyConfigService {
    private config: GitRepo;
    constructor(configData: GitRepo) { this.config = configData; }
    getLocalPath(): string { return this.config['local-path']; }
    getGitRepos(): GitRepo[] { return this.config['git-repos']; }
    isDryRun(): boolean { return false; }
}

describe('GitFilesService Integration Test (NestJS style)', () => {
    let testingModule: TestingModule;
    let gitFilesService: GitFilesService;
    let tempDir: string;

    // Utility to locate the current file and directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    beforeAll(async () => {
        // 1. Create a temp directory
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libms-test-'));
        const logger = new ConsoleLogger();
        logger.LogMsg(`Temporary directory for test: ${tempDir}`);

        // 2. Load and parse your YAML config
        const configFilePath = path.join(__dirname, '../../config/libms.dev.yaml');
        const fileContents = await fs.readFile(configFilePath, 'utf8');
        let configData: GitRepo = yaml.load(fileContents) as GitRepo;

        // 3. Override the local path with the temp dir
        configData['local-path'] = tempDir;

        // 4. Create the Nest testing module
        testingModule = await Test.createTestingModule({
            providers: [
                GitFilesService,
                {
                    // Provide the dummy config service as a stand-in for the real one
                    provide: 'CONFIG_SERVICE', // or the token your real service uses
                    useValue: new DummyConfigService(configData),
                },
                {
                    // Provide a mock localFilesService if GitFilesService depends on it
                    provide: 'LocalFilesService',
                    useValue: {
                        listDirectory: async (_p: string) => { return {}; },
                        readFile: async (_p: string) => ({}),
                    },
                },

                ConsoleLogger, //2025-03-03: added with the intent of implementing the 
                //                           the supposed custom logger;
            ],
        }).compile();

        // 5. Retrieve the service from the testing module
        gitFilesService = testingModule.get<GitFilesService>(GitFilesService);
    });

    afterAll(async () => {
        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true });
        const logger = new ConsoleLogger(); //2025-03-03: added with the intent of implementing the 
        //                                                the supposed custom logger;
        logger.LogMsg(`Test finished. Removed temporary directory: ${tempDir}`);
    });

    it('should clone all configured repositories into the temporary directory', async () => {
        await gitFilesService.init();

        // Suppose your config has user1, user2, common
        const repoKeys = ['user1', 'user2', 'common'];
        for (const key of repoKeys) {
            const cloneDir = path.join(tempDir, key);
            await expect(fs.access(cloneDir)).resolves.not.toThrow();
            const files = await fs.readdir(cloneDir);
            expect(files.length).toBeGreaterThan(0);
        }
    });
});