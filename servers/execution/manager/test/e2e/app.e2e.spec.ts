import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import AppModule from 'src/app.module.js';
import Config from 'src/config/config.service.js';
import { useConfigFile } from '../support/config-file.js';
import { createTestApp } from '../support/test-app.js';

const managedEnvVariables = [
  'EXECUTION_MANAGER_HOSTNAME',
  'EXECUTION_MANAGER_PORT',
  'EXECUTION_MANAGER_ROUTE_PREFIX',
  'EXECUTION_MANAGER_GITLAB_URL',
  'EXECUTION_MANAGER_GITLAB_USERNAME',
  'EXECUTION_MANAGER_GITLAB_TOKEN',
];

describe('Execution Manager e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /execution-manager/health returns ok', async () => {
    await supertest(app.getHttpServer())
      .get('/execution-manager/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });
  });

  it('serves nothing outside the route prefix', async () => {
    await supertest(app.getHttpServer())
      .get('/health')
      .expect(HttpStatus.NOT_FOUND);
  });
});

describe('Execution Manager configuration pipeline', () => {
  const useYaml = useConfigFile(managedEnvVariables);

  it('injects configuration from EXECUTION_MANAGER_CONFIG_PATH', async () => {
    await useYaml('hostname: 127.0.0.7\nport: 4700\n');

    const app = await createTestApp();
    const config = app.get(Config);

    expect(config.getHostname()).toBe('127.0.0.7');
    expect(config.getPort()).toBe(4700);

    await app.close();
  });

  it('does not start without the GitLab settings', async () => {
    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow('gitlab.url is not set');
  });

  it('moves every route with the route prefix', async () => {
    process.env.EXECUTION_MANAGER_ROUTE_PREFIX = 'api/manager';
    const app = await createTestApp();

    await supertest(app.getHttpServer())
      .get('/api/manager/health')
      .expect(HttpStatus.OK);
    await supertest(app.getHttpServer())
      .get('/execution-manager/health')
      .expect(HttpStatus.NOT_FOUND);

    await app.close();
  });

  it('serves the routes at the root when the prefix is /', async () => {
    await useYaml('route-prefix: /\n');
    const app = await createTestApp();

    await supertest(app.getHttpServer())
      .get('/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });

    await app.close();
  });
});
