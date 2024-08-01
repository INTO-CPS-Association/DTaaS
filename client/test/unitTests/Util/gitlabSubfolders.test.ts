import  DigitalTwinSubfolders  from '../../../src/util/gitlabSubfolders';
import { Gitlab } from '@gitbeaker/rest';

describe('DigitalTwinSubfolders', () => {
    let subfolders: DigitalTwinSubfolders;

    const mockApi = {
        Repositories: {
            allRepositoryTrees: jest.fn()
        }
    };

    beforeEach(() => {
        subfolders = new DigitalTwinSubfolders();
        subfolders.api = mockApi as unknown as InstanceType<typeof Gitlab>;
    });

    it('should fetch all files and subfolders successfully', async () => {
        const mockFiles = [
            { name: 'file1.txt', path: 'digital_twins/file1.txt', type: 'blob' },
            { name: 'subfolder', path: 'digital_twins/subfolder', type: 'tree' },
            { name: 'file2.txt', path: 'digital_twins/subfolder/file2.txt', type: 'blob' }
        ];
        mockApi.Repositories.allRepositoryTrees.mockResolvedValue(mockFiles);

        const folderEntries = await subfolders.getDTSubfolders(1);

        expect(folderEntries).toEqual([
            { name: 'subfolder', path: 'digital_twins/subfolder' }
        ]);
    });

    it('should handle errors fetching files and subfolders', async () => {
        mockApi.Repositories.allRepositoryTrees.mockRejectedValue(new Error('API error'));

        const folderEntries = await subfolders.getDTSubfolders(1);

        expect(folderEntries).toEqual([]);
    });
});