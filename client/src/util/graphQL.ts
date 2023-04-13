/* eslint-disable no-console */
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { gql } from '@apollo/client/core';

interface GitLabData {
  data: {
    currentUser: {
      id: string;
      name: string;
      username: string;
      email: string;
    };
  };
}

const createApolloClient = (accessToken: string, gitlabUrl: string) => {
  const httpLink = createHttpLink({
    uri: gitlabUrl,
  });

  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  }));

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
};

export default async function fetchGitLabGraphQLQuery(
  accessToken: string | null,
  queryString: string,
  gitlabUrl: string
): Promise<GitLabData | null> {
  try {
    if (accessToken === null) {
      throw new Error('Access Token invalid');
    }
    const query = gql`
      ${queryString}
    `;

    const client = createApolloClient(accessToken, gitlabUrl);

    const { data } = await client.query({ query });

    return { data };
  } catch (error) {
    console.error(error);
    return null;
  }
}