# 01 DT Identity and Descriptor

## Spec

A Manager and the runner's own notifications must name the DT that a
runner serves. Today nothing but the port or the MQTT base topic tells
two runners apart, and only the `mqtt` section of `runner.yaml` is
validated.

### Configuration

`runner.yaml` gains three keys and is validated as a whole:

```yaml
id: hospital-1 # required; letters, digits, _, . or -, up to 64
attributes: # optional; flat map of strings, numbers and booleans
  city: Aarhus
  beds: 120
stateMachine: 'scripts/state-machine.yaml' # optional, relative to this file
port: 5000
location: 'scripts'
commands:
  - create
  - execute
```

- `id` is required and follows the name pattern of states
  (`src/fsm/definition.ts`, `NAME`). A missing or invalid `id` stops
  the runner at startup.
- `attributes` is optional. Values are strings, numbers or booleans;
  nested values are an error. Keys follow the name pattern, and a
  `__proto__` key is an error, as in the state machine file.
- `stateMachine` replaces the fixed `state-machine.yaml` lookup in
  `location`. It is resolved with `path.resolve` against the directory
  of `runner.yaml`, so an absolute path works too. Without the key no
  machine is loaded; a key naming a missing file stops the runner with
  a message naming the path. This amends D1 of the design document and
  is a breaking change for DTs that rely on the fixed name.
- `port`, `location` and `commands` are required, as every sample and
  fixture already sets them; today a missing one is `undefined` at run
  time. `database` and `mqtt` stay optional.
- The whole file is parsed by one zod schema, `strict`, so an unknown
  key is an error. The message names every problem, as the `mqtt`
  check does today (`src/config/configuration.service.ts:32-40`), and
  that check folds into the schema.
- Before `loadConfig` runs, `Config` holds `configDefault`, which gains
  the placeholder `id: 'runner'`. It is never observable at run time,
  since `main.ts` loads the configuration before the server listens;
  only tests that construct `Config` directly see it.

### API

`GET /dt` and the MQTT route `<base>/dt` answer with the descriptor:

```json
{
  "id": "hospital-1",
  "attributes": { "city": "Aarhus", "beds": 120 },
  "commands": ["create", "execute"],
  "stateMachine": true
}
```

`attributes` is `{}` when none are configured (the schema defaults it);
`stateMachine` says
whether a machine is loaded. Later features add `manager` (05) to this
document. The descriptor carries no runner version.

## Plan

1. Add `src/config/config.schema.ts`: zod schema of the whole
   configuration, with `id`, `attributes`, `stateMachine`, `port`,
   `location`, `commands`, `database` and the existing
   `mqttConfigSchema`. Derive `ConfigValues` from it in
   `src/config/config.interface.ts` and add `id` to `configDefault`.
   `PermitCommand` there is unused; report it in the PR, do not delete
   it.
1. In `src/config/configuration.service.ts`, check the raw YAML for a
   `__proto__` key under `attributes` (export `hasOwnProto` from
   `src/fsm/definition.ts` and reuse it, with `nameSchema`, from
   there), parse through the schema, and move the path resolution
   of `location`, `database` and
   `stateMachine` into a `resolvePaths(dir, values)` helper so
   `loadConfig` stays under Qlty's complexity limit. `stateMachine`
   uses `path.resolve`; `location` and `database` keep `path.join`
   (their limitation with absolute paths is pre-existing and not
   changed here). Add `getId()`, `getAttributes()` and
   `getStateMachine()`.
1. In `src/fsm/definition.ts`, make `loadDefinition` take the file path
   (or `undefined`) instead of `location`, throw a message naming the
   path when the file is missing, pass the path to `parseDefinition`
   so its errors name the real file, and remove `DEFINITION_FILE`.
   `FsmService.load` passes `config.getStateMachine()`.
1. Add `src/dto/descriptor.dto.ts` and `src/descriptor.service.ts`,
   which composes `Config` and `FsmService`; register it in
   `src/app.module.ts`.
1. Add `GET /dt` to `src/app.controller.ts` and the `dt` route to
   `src/mqtt/mqtt.config.ts` and `src/mqtt/mqtt-request.handler.ts`.
1. Update the configuration files and every test that builds one or
   relies on the fixed name:
   - `config/runner.yaml.sample`, `test/config/runner.test.yaml`,
     `test/data/config/*.yaml`: add `id`. The Jest test config carries
     no `stateMachine`, as it permits only _create_ and the test state
     machine has an _execute_ state.
   - `test/e2e/fsm.spec.ts`: the inline `runner.yaml` gains `id` and
     `stateMachine`; the "without a state machine" test omits the key
     instead of deleting the file.
   - `test/unit/fsm.fixture.ts`: mock `getStateMachine` and write the
     file under a name it chooses.
   - `test/unit/fsm.definition.spec.ts`: call `loadDefinition` with a
     file path; add the missing-file case.
   - `test/integration/options.service.spec.ts`: the default `id` and
     the new getters.
   - `test/unit/mqtt-request.handler.spec.ts`: the handler gains the
     descriptor service as a constructor argument.
   - `api/dev.api.http`, `api/dev.mqtt.http`: the `dt` request.
1. Document the keys and the route in `README.md` (Configure, API, MQTT
   API, and the error table that names _state-machine.yaml_),
   `api/README.md`, `DEVELOPER.md`, `DOCKER.md` (the mounted
   `runner.yaml` needs `id`), and `docs/state-machine-design.md` (the
   file description and the error table that name the fixed file, D1,
   A6, and a decision for the required `id`).
1. Bump `package.json` to `0.5.0`: `id` is now required and the state
   machine file is named in `runner.yaml`.
1. List in the PR, for a separate change outside the runner:
   `docs/developer/codebase/runner.md` and
   `docs/user/servers/execution/runner/readme.md`.

## Tasks

- [x] Configuration schema accepts the sample file and rejects a missing
      `id`, an invalid `id`, a missing `commands`, nested `attributes`,
      an unknown key and an invalid `mqtt` section, each with a message
      naming the problem. Check: `test/unit/config.schema.spec.ts`.
- [x] `Config` rejects a `__proto__` attribute, resolves `stateMachine`
      relative and absolute, and exposes `getId`, `getAttributes`,
      `getStateMachine`. Check: `test/integration/options.service.spec.ts`.
- [x] Without `stateMachine` no machine loads; with it the named file
      loads; a missing file stops the runner and its error, like every
      definition error, names the path. Check:
      `test/unit/fsm.definition.spec.ts`, `test/unit/fsm.service.spec.ts`.
- [x] `GET /dt` returns the descriptor with `attributes: {}` when none
      are configured. Check: `test/e2e/descriptor.spec.ts`.
- [x] The `dt` MQTT route returns the same body. Check:
      `test/unit/mqtt-request.handler.spec.ts`, `test/e2e/mqtt.spec.ts`.
- [x] Every sample, fixture and request file carries `id`, and the
      state machine tests load their file through `stateMachine`.
      Check: `yarn test` runs green.
- [x] README, `api/README.md`, `DEVELOPER.md`, `DOCKER.md` and the
      design document (D1, A6, new decision for `id`) describe the keys
      and the route. Check: `npx markdownlint-cli` on them.
- [x] `yarn syntax`, `yarn build` and `yarn test` pass, and no new
      function crosses the Qlty thresholds. Check: their output.

## Learnings

- A strict whole-file schema breaks every fixture that writes a
  `runner.yaml`; list them in the plan before starting.
- zod 4 drops a `__proto__` key of a record without an error, so
  `attributes` needs an explicit guard, as the state machine file does.
- `path.join` of a directory and an absolute Windows path makes a
  nonsense path; `stateMachine` uses `path.resolve`. `location` and
  `database` keep `path.join` and its limit.
- js-yaml throws on an empty or comment-only file and on a syntax error
  without naming the file; the loader wraps both. A `stateMachine` that
  names a directory gave a bare `EISDIR` until `statSync().isFile()`.
- At the time of 01 the Jest test configuration permitted only _create_,
  so it could not name the test state machine, which has an _execute_
  state.
- Starting the built runner for the PR evidence showed that it no longer
  started at all: a value import without its `.js` suffix had come in
  with the state machine. ts-jest resolves such paths, so no test saw
  it. #73 fixed it and added `test/e2e/dist.spec.ts`, which runs the
  build.
