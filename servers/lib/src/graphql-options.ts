import { ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { IConfig } from './config/config.interface.js';

// GraphiQL replaces GraphQL Playground, which omits cookies from its queries
// by default. Behind the DTaaS forward-auth proxy a query without the
// session cookie is redirected to the OAuth provider and fails.
// GraphiQL is on unless graphql-playground is 'false'.
export default function graphqlOptions(config: IConfig): ApolloDriverConfig {
  return {
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    path: config.getApolloPath(),
    graphiql: String(config.getGraphqlPlayground()) !== 'false',
    playground: false,
  };
}
