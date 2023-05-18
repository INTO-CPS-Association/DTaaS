import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from 'relay-runtime';
import axios from 'axios';
import { getGitlabURL } from 'util/envUtil';

const HTTP_ENDPOINT = getGitlabURL();

const fetchFn: FetchFunction = async (request, variables) => {
  const resp = await axios.post(
    HTTP_ENDPOINT,
    {
      query: request.text,
      variables,
    },
    {
      headers: {
        Accept:
          'application/graphql-response+json; charset=utf-8, application/json; charset=utf-8',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // <-- Additional headers like 'Authorization' would go here
      },
    }
  );

  return resp.data;
};

function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
}

const RelayEnvironment = createRelayEnvironment();
export default RelayEnvironment;
