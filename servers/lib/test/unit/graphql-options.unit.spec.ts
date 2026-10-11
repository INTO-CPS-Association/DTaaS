import { describe, it, expect, jest } from '@jest/globals';
import graphqlOptions from '../../src/graphql-options';
import { IConfig } from 'src/config/config.interface';
import { jestMockConfigService } from 'test/testUtil';

const configWithPlayground = (playground: string): IConfig => {
  const config = jestMockConfigService();
  (config.getApolloPath as jest.Mock<() => string>).mockReturnValue('/lib');
  (config.getGraphqlPlayground as jest.Mock<() => string>).mockReturnValue(
    playground,
  );
  return config;
};

describe('graphqlOptions', () => {
  it('serves GraphiQL at the Apollo path when the playground is enabled', () => {
    const options = graphqlOptions(configWithPlayground('true'));

    expect(options.path).toBe('/lib');
    expect(options.graphiql).toBe(true);
    expect(options.playground).toBe(false);
  });

  it('serves no landing page when the playground is disabled', () => {
    const options = graphqlOptions(configWithPlayground('false'));

    expect(options.graphiql).toBe(false);
    expect(options.playground).toBe(false);
  });
});
