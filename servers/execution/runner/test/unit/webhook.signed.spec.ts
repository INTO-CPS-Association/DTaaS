import { generateKeyPairSync } from 'node:crypto';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Signer from 'src/auth/signer';
import { verifiedPayload } from 'test/sign.util';
import { answer, notification, setup, webhook } from './webhook.fixture';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const signer = new Signer(privateKey, 'hospital-1');

// The request of a signed post, with the bearer token if given
const signedPost = (token?: string) => ({
  method: 'POST',
  headers:
    token === undefined
      ? { 'Content-Type': 'application/jose' }
      : {
          'Content-Type': 'application/jose',
          Authorization: `Bearer ${token}`,
        },
  body: signer.encode(notification),
  signal: expect.any(AbortSignal),
});

describe('Webhook client with a signing key', () => {
  let fetchMock: jest.SpiedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValue(answer(204));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should post a JWS as application/jose with the bearer token', async () => {
    const { client } = setup(webhook, signer);

    await client.post(notification);

    expect(fetchMock).toHaveBeenCalledWith(webhook.url, signedPost('secret'));
    const { body } = fetchMock.mock.calls[0][1] as { body: string };
    expect(verifiedPayload(body, publicKey, 'hospital-1')).toEqual(
      notification,
    );
  });

  it('Should post a JWS once at shutdown, without a token', async () => {
    const { client } = setup({ url: webhook.url }, signer);

    await client.sendOnce(notification);

    expect(fetchMock).toHaveBeenCalledWith(webhook.url, signedPost());
  });
});
