import type { Server } from 'node:http';
import { z } from 'zod';
import type { ParameterValue } from '../dto/parameters.dto.js';
import type { Definition } from './definition.js';
import { type Inherited, refusedName } from '../scripts/launch.js';
import Parameters, { variableName } from './parameters.js';

// The variables of a script's environment, by name
export type Env = Readonly<Record<string, string>>;

// A declared name is upper case and leaves the runner's prefixes alone
const VARIABLE = /^[A-Z][A-Z0-9_]*$/;

const RESERVED = /^(DT|RUNNER)_/;

// A reference to a runner variable in a declared value
const REFERENCE = /\$\{([^}]*)\}/g;

// Why a declared name is refused, if it is; zod reports a refused
// record key only as an invalid key, so the names are checked apart
function nameProblem(name: string): string | undefined {
  if (!VARIABLE.test(name)) {
    return 'must be upper-case letters, digits or _, from a letter';
  }
  return RESERVED.test(name) ? 'must not start with DT_ or RUNNER_' : undefined;
}

// The env of the state machine file and of a state; values become
// strings
export const envSchema = z
  .record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]).transform(String),
  )
  .superRefine((env, context) => {
    Object.keys(env).forEach((name) => {
      const message = nameProblem(name);
      if (message !== undefined) {
        context.addIssue({ code: 'custom', message, path: [name] });
      }
    });
  })
  .default({});

// The runner variables that a declared value may interpolate, besides
// the parameter variables
export const RUNNER_VARIABLES = [
  'RUNNER_URL',
  'RUNNER_TOKEN',
  'DT_ID',
  'DT_STATE',
  'DT_ENTRY',
];

export const knownNames = ({ parameters }: Definition): Set<string> =>
  new Set([...RUNNER_VARIABLES, ...[...parameters.keys()].map(variableName)]);

const references = (value: string): string[] =>
  [...value.matchAll(REFERENCE)].map(([, name]) => name);

// One problem for each unknown name that a value of the env refers to
const unknownNames = (env: Env, known: Set<string>, owner: string) =>
  Object.entries(env).flatMap(([name, value]) =>
    references(value)
      .filter((reference) => !known.has(reference))
      .map((reference) => `${owner}${name} uses unknown variable ${reference}`),
  );

// With a script account, setpriv starts with capabilities but not in
// secure-execution mode, so its loader would honour these names
const refusedNames = (env: Env, owner: string) =>
  Object.keys(env)
    .filter(refusedName)
    .map((name) => `${owner}${name} is refused with scripts.user`);

// The problems of the env of a definition that its schema can not see,
// and with a script account the names that the launch refuses
export function envProblems(
  definition: Definition,
  separated = false,
): string[] {
  const known = knownNames(definition);
  const envs: Array<[Env, string]> = [
    [definition.env, 'env '],
    ...[...definition.stateEnv].map(([state, env]): [Env, string] => [
      env,
      `state ${state} env `,
    ]),
  ];
  const unknown = envs.flatMap(([env, owner]) =>
    unknownNames(env, known, owner),
  );
  const refused = envs.flatMap(([env, owner]) => refusedNames(env, owner));
  return [...unknown, ...(separated ? refused : [])];
}

// What the environment of one script is built from. Without a state
// machine there is no entry, definition or parameter value, and without
// access control no token. inherited and platform default to those of
// the runner process.
export type ScriptContext = {
  id: string;
  url?: string;
  token?: string;
  command: string;
  state?: string;
  entry?: number;
  values?: Readonly<Record<string, ParameterValue>>;
  definition?: Definition;
  inherited?: Inherited;
  platform?: NodeJS.Platform;
};

// The state is empty before the first transition
const machineVariables = (state?: string, entry?: number): Env =>
  entry === undefined ? {} : { DT_STATE: state ?? '', DT_ENTRY: `${entry}` };

const parameterVariables = (values: ScriptContext['values'] = {}): Env =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      variableName(name),
      String(value),
    ]),
  );

function runnerVariables(context: ScriptContext) {
  const { id, url, token, state, entry, values } = context;
  return {
    ...(url === undefined ? {} : { RUNNER_URL: url }),
    ...(token === undefined ? {} : { RUNNER_TOKEN: token }),
    DT_ID: id,
    ...machineVariables(state, entry),
    ...parameterVariables(values),
  };
}

// The env of the file, then that of the command's state, with the
// runner variables interpolated; an unset one, such as RUNNER_URL
// before the server listens, is empty
function declaredVariables(context: ScriptContext, variables: Env): Env {
  const { definition, command } = context;
  const env = { ...definition?.env, ...definition?.stateEnv.get(command) };
  return Object.fromEntries(
    Object.entries(env).map(([name, value]) => [
      name,
      value.replaceAll(
        REFERENCE,
        (_, reference: string) => variables[reference] ?? '',
      ),
    ]),
  );
}

// Windows names are case-insensitive, so there an inherited name that
// matches a name the runner sets is dropped, lest the child see both
function inheritedVariables(
  inherited: NonNullable<ScriptContext['inherited']>,
  platform: NodeJS.Platform,
  names: Set<string>,
): Env {
  return Object.fromEntries(
    Object.entries(inherited).filter(
      (variable): variable is [string, string] =>
        variable[1] !== undefined &&
        (platform !== 'win32' || !names.has(variable[0].toUpperCase())),
    ),
  );
}

// The whole environment of a script; later wins: the inherited
// environment, the runner variables, the file's env, the state's env
export function scriptEnvironment(context: ScriptContext): Env {
  const { inherited = process.env, platform = process.platform } = context;
  const variables = runnerVariables(context);
  const own = { ...variables, ...declaredVariables(context, variables) };
  const names = new Set(Object.keys(own));
  return { ...inheritedVariables(inherited, platform, names), ...own };
}

// The address of the runner's HTTP API for its scripts: listen(port)
// binds all interfaces, so the loopback address reaches it. A server
// that does not listen yet, or listens on a pipe, has none.
export function runnerUrl(server: Pick<Server, 'address'>): string | undefined {
  const address = server.address();
  return address !== null && typeof address === 'object'
    ? `http://127.0.0.1:${address.port}`
    : undefined;
}

// What the scripts of a runner learn about it: its identity, the
// address of its API and the token for it, and the declared env and
// parameters of its DT
export class RunnerContext {
  private id = '';

  private url: string | undefined;

  private token: string | undefined;

  private definition: Definition | undefined;

  private parameters: Parameters | undefined;

  private inherited: Inherited | undefined;

  load(id: string, definition?: Definition, parameters?: Parameters): void {
    this.id = id;
    this.definition = definition;
    this.parameters = parameters;
  }

  setApi(url: string | undefined, token: string | undefined): void {
    this.url = url;
    this.token = token;
  }

  // What every script's environment starts from; the runner's own
  // without a call
  inherit(base: Inherited): void {
    this.inherited = base;
  }

  // The environment of the command's script, for the entry of the state
  environment(command: string, state?: string, entry?: number): Env {
    return scriptEnvironment({
      id: this.id,
      url: this.url,
      token: this.token,
      command,
      state,
      entry,
      values: this.parameters?.values(),
      definition: this.definition,
      inherited: this.inherited,
    });
  }
}
