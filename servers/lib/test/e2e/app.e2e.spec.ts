import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import AppModule from '../../src/app.module';
import {
  e2eReadFile,
  e2elistDirectory,
  expectedFileContentResponse,
  expectedListDirectoryResponse,
} from '../testUtil';

const client = new ApolloClient({
  uri: `http://localhost:${process.env.PORT}${process.env.APOLLO_PATH}`,
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

  it('should return the directory contents requested with HTTP POST query', async () => {
    const query = e2elistDirectory;

    const response = await request(`http://localhost:${process.env.PORT}`)
      .post(process.env.APOLLO_PATH)
      .send({ query });
    expect(response.body).toEqual(expectedListDirectoryResponse);
  }, 10000);

  it('should return the directory contents requested with GraphQL query', async () => {
    const query = gql(e2elistDirectory);

    const { data } = await client.query({ query });
    expect({ data }).toEqual(expectedListDirectoryResponse);
  }, 10000);

  it('should return the filecontent requested with HTTP POST query', async () => {
    const query = e2eReadFile;

    const response = await request(`http://localhost:${process.env.PORT}`)
      .post(process.env.APOLLO_PATH)
      .send({ query });
    expect(response.body).toEqual(expectedFileContentResponse);
  }, 10000);

  it('should return the filecontent requested with GraphQL query', async () => {
    const query = gql(e2eReadFile);

    const { data } = await client.query({ query });
    expect({ data }).toEqual(expectedFileContentResponse);
  }, 10000);
});
