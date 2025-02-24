
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import GitFilesService from '../../src/files/git/git-files.service';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import yaml from 'js-yaml';
import * as os from 'os';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

class DummyConfigService {
    private config: any;
    constructor(configData: any) { this.config = configData; }
    getLocalPath(): string { return this.config['local-path']; }
    getGitRepos(): any[] { return this.config['git-repos']; }
    isDryRun(): boolean { return false; }
}


describe('GitFilesService Integration Test Using Actual Config', () => {
    let tempDir: string;
    let gitFilesService: GitFilesService;
    let configService: DummyConfigService;


    beforeAll(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libms-test-'));
        console.log(`Temporary directory for test: ${tempDir}`);


        const configFilePath = path.join(__dirname, '../../libms.yaml');
        const fileContents = await fs.readFile(configFilePath, 'utf8');
        const configData = yaml.load(fileContents) as any;


        configData['local-path'] = tempDir;


        configData['git-repos'][0]['user1']['http-token'];
        configService = new DummyConfigService(configData);
        gitFilesService = new GitFilesService(configService as any);
        (gitFilesService as any).localFilesService = {
            listDirectory: async (_p: string) => ({}),
            readFile: async (_p: string) => ({}),
        };
    });



    afterAll(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Test finished.`);
        console.log(`Removed temporary directory: ${tempDir}`);
    });


    it('should clone all configured repositories into the temporary directory', async () => {
        await gitFilesService.init();
        const repoKeys = ['user1', 'user2', 'common'];
        for (const key of repoKeys) {
            const cloneDir = path.join(tempDir, key);
            await expect(fs.access(cloneDir)).resolves.not.toThrow();
            const files = await fs.readdir(cloneDir);
            expect(files.length).toBeGreaterThan(0);
        }
    });
});
