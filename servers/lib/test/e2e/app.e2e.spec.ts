import { describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import fetch from 'cross-fetch';
import {
  ApolloClient,
  DocumentNode,
  InMemoryCache,
  gql,
  HttpLink,
} from '@apollo/client/core';
import AppModule from '../../src/app.module';
import {
  e2eReadFile,
  e2elistDirectory,
  expectedFileContentResponse,
  expectedListDirectoryResponse,
} from '../testUtil';
import { CONFIG_SERVICE, IConfig } from 'src/config/config.interface';
import Config from 'src/config/config.service';

let client;
let configService: IConfig;

describe('End to End test for the application', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    configService = moduleFixture.get<Config>(CONFIG_SERVICE);
    app = moduleFixture.createNestApplication();
    client = new ApolloClient({
      link: new HttpLink({
        uri: `http://localhost:${configService.getPort()}${configService.getApolloPath()}`,
        fetch,
      }),
      cache: new InMemoryCache(),
    });
    await app.init(); // Initialize the application
    await app.listen(configService.getPort());

    // Check if the port is available

    while (!app.getHttpServer().listening) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, 15000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  async function HTTPQuery(
    query: string,
    expectedResponse: unknown,
  ): Promise<void> {
    const response = await request(
      `http://localhost:${configService.getPort()}`,
    )
      .post(configService.getApolloPath())
      .send({ query });
    expect(response.body).toEqual(expectedResponse);
  }

  async function GraphQLQuery(
    query: DocumentNode,
    expectedResponse: unknown,
  ): Promise<void> {
    const { data } = await client.query({ query });
    expect({ data }).toEqual(expectedResponse);
  }
  it('should return the directory contents requested with HTTP POST query', async () => {
    await HTTPQuery(e2elistDirectory, expectedListDirectoryResponse);
  }, 10000);

  it('should return the file content requested with HTTP POST query', async () => {
    await HTTPQuery(e2eReadFile, expectedFileContentResponse);
  }, 10000);

  it.skip('should return the directory contents requested with GraphQL query', async () => {
    await GraphQLQuery(gql(e2elistDirectory), expectedListDirectoryResponse);
  }, 10000);

  it.skip('should return the file content requested with GraphQL query', async () => {
    await GraphQLQuery(gql(e2eReadFile), expectedFileContentResponse);
  }, 10000);
});
