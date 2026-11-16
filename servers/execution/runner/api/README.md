# Runner API Requests

This directory has request files for trying out the HTTP and MQTT APIs
of a runner on the developer computer. [API.md](API.md) is the
reference of both APIs, with examples from the hospital demo.

| File            | Protocol | VS Code extension      |
| :-------------- | :------- | :--------------------- |
| `dev.api.http`  | HTTP     | REST Client or httpYac |
| `dev.mqtt.http` | MQTT     | httpYac                |

## Required Extensions

- [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
  sends the HTTP requests of `dev.api.http`. It does not support MQTT.
- [httpYac](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac)
  sends both the HTTP requests of `dev.api.http` and the MQTT requests
  of `dev.mqtt.http`. The same tool is available on the command line
  as the [httpyac](https://www.npmjs.com/package/httpyac) npm package.

Install the extensions from the Extensions view of VS Code, or with:

```bash
code --install-extension humao.rest-client
code --install-extension anweber.vscode-httpyac
```

Both extensions add their links above each request of an `.http` file.
Either of them can send the requests of `dev.api.http`.

## Start the Runner

Run these commands in the `servers/execution/runner` directory:

```bash
cp config/runner.test.yaml.sample config/runner.test.yaml
yarn install
yarn build
yarn start --config config/runner.test.yaml
```

The runner listens on port 5000, which `dev.api.http` expects.

The MQTT requests also need a broker and an `mqtt` section in
`config/runner.test.yaml`. Start a Mosquitto broker in Docker:

```bash
docker run -d --rm --name mosquitto -p 1883:1883 \
  eclipse-mosquitto:2.1.2-alpine \
  sh -c 'printf "listener 1883\nallow_anonymous true\n" > /tmp/m.conf &&
    exec mosquitto -c /tmp/m.conf'
```

Then uncomment the `mqtt` section at the end of
`config/runner.test.yaml` before starting the runner. Its broker and
topic match the `@broker` and `@topic` variables of `dev.mqtt.http`.
Stop the broker with `docker stop mosquitto`.

The `dt` request returns the descriptor of the digital twin, with the
`id` of `config/runner.test.yaml`. The state machine requests at the
end of both files use `test/data/scripts/state-machine.yaml`, which
`config/runner.test.yaml` names with `stateMachine`. A transition to
_create_ runs _create_ and then _execute_; the `restart` event goes
back to _create_, and the `stop` event is refused as an undeclared
event. The parameters requests set `scope` to `multi`, which raises
`scope-changed`: in _execute_, that restarts the _execute_ script.

The peers requests show and switch the peer `hospital-2`, which
`config/runner.test.yaml` lists; the state machine subscribes to its
state `full` with the event `neighbour-full`. With the `mqtt` section,
the `peerFull` request of `dev.mqtt.http` publishes, as that peer
would, a retained state document in state `full`, which takes
_execute_ to _create_; `peerOpen` publishes `open`, after which a
`full` raises the event again. `set-peers` disables the peer, and
`PUT /peers` with `true` enables it.

The command requests with input run _echo-input_, which writes its
input back, so the reply carries it in `result.stdout`; _fail_ shows a
`failed` reply with exit code 3. Both scripts are in
`test/data/scripts`, and `config/runner.test.yaml` permits them.

## Send the Requests

In VS Code, open a request file and select **Send Request** (REST
Client) or **send** (httpYac) above a request. The response opens
beside the file.

On the command line, `npx` downloads httpYac on first use:

```bash
npx httpyac@6.16.7 send api/dev.api.http --all
npx httpyac@6.16.7 send api/dev.mqtt.http --all
npx httpyac@6.16.7 send api/dev.mqtt.http --name execute
```

The `--name` option sends one request, using the `@name` given above
it in the file. Without `--all` or `--name`, httpyac asks which
request to send.

To use another runner or broker, change the variables at the top of
the request files. httpyac uses these file variables even when its
`--var` option sets variables of the same name.

## Access Control

A runner with `principals` in its `auth` section
([README](../README.md#access-control)) answers the unsigned requests
with `401`; an `auth` section with only a `key` leaves them open. Write
a key pair, from the runner directory:

```bash
node demo/hospital/tools/keygen.mjs alice keys
node demo/hospital/tools/keygen.mjs manager-1 keys
```

and list the printed public keys under `auth` in
`config/runner.test.yaml`, `alice` as `client` and `manager-1` as
`manager`. Then:

- In `dev.api.http`, set `@keyFile` to `keys/alice.key`. httpYac signs
  every request with the `{{@request}}` script at the top of the file;
  REST Client does not run scripts, so it sends them unsigned.
- In `dev.mqtt.http`, the `signedExecute` request publishes the
  envelope that the demo's `tools/sign.mjs` makes with
  `keys/manager-1.key`; `@keyDir` is relative to the directory httpyac
  runs in. The other MQTT requests stay plain.

A token is valid for 30 s and once only, so each send signs anew.

With `auth.key` ([README](../README.md#signed-output)), the runner
signs its MQTT responses and notifications, so httpYac shows each as
the text of a compact JWS rather than as JSON; its middle part is the
base64url of the JSON. The HTTP replies stay JSON.

## MQTT Requests

Each MQTT request subscribes to the response topic of its route,
publishes the request, and waits for the response. If the runner is not
connected to the broker, the request waits until you cancel it, with
the cancel button in VS Code or Ctrl+C on the command line.

httpYac publishes MQTT requests without MQTT 5 properties. So
`dev.mqtt.http` can not send a request key or a response topic of its
own, and the responses go to the default response topics, which every
subscriber receives. The [runner README](../README.md#mqtt-api) shows
how to send a request key with `mosquitto_pub`.
