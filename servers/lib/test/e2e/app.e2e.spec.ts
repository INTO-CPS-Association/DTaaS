import { describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import fetch from 'cross-fetch';
import { ApolloClient, DocumentNode, InMemoryCache, gql} from "@apollo/client/core/core.cjs";
import { HttpLink } from "@apollo/client/link/http/http.cjs";
import AppModule from '../../src/app.module';
import {
  e2eReadFile,
  e2elistDirectory,
  expectedFileContentResponse,
  expectedListDirectoryResponse,
} from '../testUtil';

const client = new ApolloClient({
  link: new HttpLink({
    uri: `http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}`,
    fetch,
  }),
  cache: new InMemoryCache({ addTypename: false }),
});

describe('End to End test for the application', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init(); // Initialize the application
    await app.listen(process.env.PORT);

    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }, 10000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  async function HTTPQuery(
    query: string,
    expectedResponse: unknown,
  ): Promise<void> {
    const response = await request(`http://localhost:${process.env.PORT}`)
      .post(process.env.APOLLO_PATH)
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

  it('should return the directory contents requested with GraphQL query', async () => {
    await GraphQLQuery(gql(e2elistDirectory), expectedListDirectoryResponse);
  }, 10000);

  it('should return the file content requested with GraphQL query', async () => {
    await GraphQLQuery(gql(e2eReadFile), expectedFileContentResponse);
  }, 10000);
});
