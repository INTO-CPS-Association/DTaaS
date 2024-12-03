import axios from 'axios';
import { unlink, writeFile } from 'fs/promises';
import { config } from 'dotenv';

describe('cloudcmd test for the application', () => {
  beforeAll(async () => {
    config();

    await writeFile(`${process.env.LOCAL_PATH}/test.txt`, 'content12345');

    await new Promise((resolve) => setTimeout(resolve, 50000)); // This is problematic.
  }, 55000);

  afterAll(async () => {
    await unlink(`${process.env.LOCAL_PATH}/test.txt`);
    await unlink(`${process.env.LOCAL_PATH}/uploadTest.txt`);
  }, 10000);

  it('should return the correct directory that is set as root', async () => {
    const response = await axios.get(
      `http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs`,
      {
        responseType: 'json',
      },
    );
    expect(response.data.path).toEqual('/');
    const fileNames = response.data.files.map((file) => file.name);
    expect(fileNames).toContain('common');
    expect(fileNames).toContain('user1');
    expect(fileNames).toContain('user2');
  }, 10000);

  it('should return the content of a file that is uplaoded to cloudcmd', async () => {
    const response = await axios.get(
      `http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs/test.txt`,
    );

    expect(response.data).toEqual('content12345');
  }, 10000);

  it('should upload a file to cloudcmd', async () => {
    const response = await axios.put(
      `http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs/uploadTest.txt`,
      'some content',
      { responseType: 'text' },
    );

    expect(response.data).toEqual('save: ok("uploadTest.txt")');
  }, 10000);
});
