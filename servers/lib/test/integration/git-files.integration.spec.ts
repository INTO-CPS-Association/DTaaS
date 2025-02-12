// servers/lib/test/integration/git-files.integration.spec.ts

import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { promises as fs } from 'fs';
import * as os from 'os';
import yaml from 'js-yaml';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

// Import your GitFilesService.
// Adjust the path as needed.
import GitFilesService from '../../src/files/git/git-files.service';

// Create a DummyConfigService that implements just the methods needed by GitFilesService.
class DummyConfigService {
    private config: any;
    constructor(configData: any) {
        this.config = configData;
    }
    getLocalPath(): string {
        return this.config['local-path'];
    }
    getGitRepos(): any[] {
        return this.config['git-repos'];
    }
    isDryRun(): boolean {
        return false;
    }
    // If the Config interface requires more properties or methods,
    // you can stub them here as needed.
}

describe('GitFilesService Integration Test Using Actual Config', () => {
    let tempDir: string;
    let gitFilesService: GitFilesService;
    let configService: DummyConfigService;

    beforeAll(async () => {
        // 1. Create a temporary directory for cloning.
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libms-test-'));
        console.log(`Temporary directory for test: ${tempDir}`);

        // 2. Load the configuration from the YAML file.
        // Adjust the path to your actual config file.
        const configFilePath = path.join(__dirname, '../../libms.yaml');
        const fileContents = await fs.readFile(configFilePath, 'utf8');
        const configData = yaml.load(fileContents) as any;

        // 3. Override the local-path with the temporary directory.
        configData['local-path'] = tempDir;

        // 4. Override the token for testing.
        // This replaces the literal "HTTP_TOKEN" with the value from your .env file,
        // or 'dummy-token' if the environment variable is not set.
        configData['git-repos'][0]['user1']['http-token'] = process.env.TEST_GIT_TOKEN || 'dummy-token';


        // 5. Instantiate the dummy config service with the loaded configuration.
        configService = new DummyConfigService(configData);

        // 6. Instantiate GitFilesService with the dummy config service.
        // Using "as any" to bypass full interface requirements.
        gitFilesService = new GitFilesService(configService as any);

        // 7. Inject a dummy LocalFilesService if needed.
        (gitFilesService as any).localFilesService = {
            listDirectory: async (_p: string) => ({}),
            readFile: async (_p: string) => ({}),
        };
    });

    afterAll(async () => {
        // Remove the temporary directory after tests.
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Removed temporary directory: ${tempDir}`);
    });

    it('should clone all configured repositories into the temporary directory', async () => {
        await gitFilesService.init();

        // The configuration specifies three repositories with keys: "user1", "user2", and "common".
        const repoKeys = ['user1', 'user2', 'common'];
        for (const key of repoKeys) {
            // The clone directory is constructed as: <local-path>/<key>
            const cloneDir = path.join(tempDir, key);
            await expect(fs.access(cloneDir)).resolves.not.toThrow();
            const files = await fs.readdir(cloneDir);
            expect(files.length).toBeGreaterThan(0);
        }
    });
});
