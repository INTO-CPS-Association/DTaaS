# Developer Instructions

## Configure

The gateway starts with built-in defaults, but it refuses every token until
`gitlab-url` is set. Copy the sample configuration:

```bash
cp config/signals.yaml.sample config/signals.yaml
```

The `config/signals.yaml` file is not tracked by git. Put the secrets in files
outside the repository and name them with `rabbitmq-password-file` and
`influx-tokens-file`.

## Developer Commands

```bash
yarn install       # Install dependencies for the microservice
yarn syntax        # Analyze code for errors and style issues
yarn format        # Format .ts files with prettier
yarn build         # Compile TypeScript into the dist/ directory
yarn test          # Run unit and end-to-end tests with coverage
yarn test:unit     # Run unit tests
yarn test:e2e      # Run end-to-end tests
yarn test:int      # Run the RabbitMQ integration test (needs Docker)
yarn test:nocov    # Run unit and end-to-end tests without coverage
yarn check:final   # Run syntax, format, build and test together
yarn start         # Start the application
yarn clean         # Delete node_modules, coverage, dist and graph files
```

To start the application with the configuration file, run

```bash
yarn start --config config/signals.yaml
```

## Tests

- `test/unit` covers each part on its own: the identity cache and token
  expiry, the guard, the GitLab policy, path validation, the routing keys,
  the AMQP link, the Flux parameters, the CSV parser and the configuration.
- `test/e2e` runs the whole application against a GitLab stub served in the
  same process and a broker held in memory. It shows that a member receives a
  sample over server-sent events, that a non-member gets `403` and nothing is
  bound, and that no token reaches the logs.
- `test/integration` starts `rabbitmq:4.2.8-management` in Docker, creates
  the service user with the commands below, and shows that the gateway
  receives a published message and that the service user can neither publish
  nor declare a queue outside its prefix. It is skipped when `docker info`
  fails.

## Dependencies

Every dependency is pinned to an exact version, and each version was
published at least ten days before it was added. Resolve new versions with
`npm install --before=<date ten days ago>` and keep `yarn.lock` as the lock
file.

## Read-Only Service User in RabbitMQ

Create the user once. `rabbitmqctl` prompts for the password, so it never
appears in the shell history or the process list:

```bash
rabbitmqctl add_user dtaas-signals
```

Then, for each vhost (one per DTaaS user, named after the user), give it the
right to declare, bind and read only its own queues, and to read `amq.topic`:

```bash
rabbitmqctl set_permissions -p <vhost> dtaas-signals \
  '^dtaas-signals\..*' '^dtaas-signals\..*' '^(amq\.topic|dtaas-signals\..*)$'
rabbitmqctl set_topic_permissions -p <vhost> dtaas-signals amq.topic '^$' '.*'
```

The topic permission `'^$'` for write means the service user can publish
under no routing key, so a leaked gateway credential cannot forge signals.
Write the password to the file `rabbitmq-password-file` names, readable only
by the user that runs the gateway.

## Read-Only Tokens in InfluxDB

For each org, create a token that can only read the owner's bucket:

```bash
influx bucket find --org <org> --name <bucket>
influx auth create --org <org> --read-bucket <bucket-id> \
  --description "dtaas-signals read <org>"
```

Collect the tokens in the file `influx-tokens-file` names, one entry per org:

```json
{ "alice": "<read-only token of alice>" }
```
