import axios from 'axios';
import { unlink, writeFile } from 'fs/promises';
import { config } from 'dotenv';

describe('cloudcmd test for the application', () => {
  beforeAll(async () => {
    config();

    await writeFile(`${process.env.LOCAL_PATH}/test.txt`, 'content12345');
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }, 10000);

  afterAll(async () => {
    await unlink(`${process.env.LOCAL_PATH}/test.txt`);
    await unlink(`${process.env.LOCAL_PATH}/uploadTest.txt`);
  }, 10000);

  it('should return the correct directory that is set as root', async () => {
    const response = await axios.get(
      'http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs',
      {
        responseType: 'json',
      },
    );
    /* eslint-disable no-console */
    console.log(response.data);
    /* eslint-enable no-console */
    expect(response.data.path).toEqual('/');
    expect(response.data.files[0].name).toEqual('common');
    expect(response.data.files[1].name).toEqual('user1');
    expect(response.data.files[2].name).toEqual('user2');
  }, 10000);

  it('should return the content of a file that is uplaoded to cloudcmd ', async () => {
    const response = await axios.get(
      'http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs/test.txt',
    );

    expect(response.data).toEqual('content12345');
  }, 10000);

  it('should upload a file to cloudcmd', async () => {
    const response = await axios.put(
      'http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}/files/api/v1/fs/uploadTest.txt',
      'some content',
      { responseType: 'text' },
    );

    expect(response.data).toEqual('save: ok("uploadTest.txt")');
  }, 10000);
});
