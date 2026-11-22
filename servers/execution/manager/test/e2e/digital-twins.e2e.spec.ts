import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import {
  DigitalTwinNotFoundError,
  ExecutionNotFoundError,
  GitlabFailureError,
} from 'src/digital-twins/digital-twins.errors.js';
import {
  createFakeDigitalTwinsService,
  execution,
} from '../support/fake-digital-twins-service.js';
import { createTestApp } from '../support/test-app.js';

const fakeService = createFakeDigitalTwinsService();

describe('Digital twin routes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp(fakeService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const request = () => supertest(app.getHttpServer());
  const base = '/execution-manager/digital-twins';

  it('GET /digital-twins lists the digital twins', async () => {
    fakeService.listDigitalTwins.mockResolvedValue([
      { name: 'hello-world', description: 'Says hello' },
    ]);

    const response = await request().get(base);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([
      { name: 'hello-world', description: 'Says hello' },
    ]);
  });

  it('GET /digital-twins/:name reads one digital twin', async () => {
    const details = {
      name: 'hello-world',
      description: 'Says hello',
      fullDescription: '# Hello',
      descriptionFiles: ['description.md'],
      configFiles: [],
      lifecycleFiles: ['execute'],
    };
    fakeService.getDigitalTwin.mockResolvedValue(details);

    const response = await request().get(`${base}/hello-world`);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual(details);
    expect(fakeService.getDigitalTwin).toHaveBeenCalledWith('hello-world');
  });

  it('POST /digital-twins/:name/executions starts an execution with 202', async () => {
    fakeService.startExecution.mockResolvedValue(execution);

    const response = await request()
      .post(`${base}/hello-world/executions`)
      .send({ runnerTag: 'windows', branch: 'main' });

    expect(response.status).toBe(HttpStatus.ACCEPTED);
    expect(response.body).toEqual(execution);
    expect(fakeService.startExecution).toHaveBeenCalledWith('hello-world', {
      runnerTag: 'windows',
      branch: 'main',
    });
  });

  it('starts an execution without a body', async () => {
    fakeService.startExecution.mockResolvedValue(execution);

    const response = await request().post(`${base}/hello-world/executions`);

    expect(response.status).toBe(HttpStatus.ACCEPTED);
    expect(fakeService.startExecution).toHaveBeenCalledWith('hello-world', {});
  });

  it.each([
    ['an empty runner tag', { runnerTag: ' ' }],
    ['an unknown field', { image: 'ubuntu' }],
  ])('rejects a start request with %s', async (_, body) => {
    const response = await request()
      .post(`${base}/hello-world/executions`)
      .send(body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(fakeService.startExecution).not.toHaveBeenCalled();
  });

  it('rejects a digital twin name that is not a directory name', async () => {
    const response = await request().get(
      `${base}/${encodeURIComponent('a b')}`,
    );

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(['must be a directory name']);
  });

  it('GET /digital-twins/:name/executions lists the executions', async () => {
    fakeService.listExecutions.mockResolvedValue([execution]);

    const response = await request().get(`${base}/hello-world/executions`);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual([execution]);
  });

  it('GET /digital-twins/:name/executions/:id reads one execution', async () => {
    fakeService.getExecution.mockResolvedValue(execution);

    const response = await request().get(`${base}/hello-world/executions/e-1`);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual(execution);
    expect(fakeService.getExecution).toHaveBeenCalledWith('hello-world', 'e-1');
  });

  it('POST /digital-twins/:name/executions/:id/stop stops an execution', async () => {
    fakeService.stopExecution.mockResolvedValue({
      ...execution,
      status: 'canceled',
    });

    const response = await request().post(
      `${base}/hello-world/executions/e-1/stop`,
    );

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.status).toBe('canceled');
    expect(fakeService.stopExecution).toHaveBeenCalledWith(
      'hello-world',
      'e-1',
    );
  });

  it('answers 404 for an unknown digital twin', async () => {
    fakeService.getDigitalTwin.mockRejectedValue(
      new DigitalTwinNotFoundError('nope'),
    );

    const response = await request().get(`${base}/nope`);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Digital twin nope not found',
      error: 'Not Found',
    });
  });

  it('answers 404 for an unknown execution', async () => {
    fakeService.getExecution.mockRejectedValue(
      new ExecutionNotFoundError('hello-world', 'e-9'),
    );

    const response = await request().get(`${base}/hello-world/executions/e-9`);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe(
      'Execution e-9 of hello-world not found',
    );
  });

  it("answers 502 with GitLab's reason when GitLab fails", async () => {
    fakeService.startExecution.mockRejectedValue(
      new GitlabFailureError(
        'Could not start hello-world on GitLab: 401 Unauthorized',
      ),
    );

    const response = await request().post(`${base}/hello-world/executions`);

    expect(response.status).toBe(HttpStatus.BAD_GATEWAY);
    expect(response.body).toEqual({
      statusCode: 502,
      message: 'Could not start hello-world on GitLab: 401 Unauthorized',
      error: 'Bad Gateway',
    });
  });
});
