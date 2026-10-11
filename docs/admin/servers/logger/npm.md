# Logger Microservice NPM Package

The logger microservice package is `@into-cps-association/logger-ms`.
Install it from npmjs:

```bash
npm install -g @into-cps-association/logger-ms
```

Start it with `logger-ms`. It reads `logger.yaml` from the working
directory if the file exists; use `-c <file>` to give another
configuration file.

To build and start it from source instead, run these commands in
`servers/logger/`:

```bash
yarn install
yarn build
yarn start
```

By default, the logger binds to `127.0.0.1:4003` and accepts
unauthenticated ingest. Set `LOGGER_AUTH_TOKEN` for non-browser producers
that can send bearer headers. The bundled browser client uses
`navigator.sendBeacon`, which cannot set custom headers, so enforce
browser ingest authentication at the reverse proxy.

For the full configuration reference, see
[`servers/logger/README.md`](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/logger/README.md).
