import { z } from 'zod';
import {
  ParameterDto,
  ParametersBody,
  ParametersDto,
  ParameterValue,
} from '../dto/parameters.dto.js';
import { nameSchema } from './name.js';

// The values of each type, for defaults and for new values; an enum
// value is also one of the values of its declaration
const VALUES = {
  string: z.string(),
  number: z.number(),
  boolean: z.boolean(),
  enum: z.string(),
};

const shared = {
  controllable: z.boolean().default(false),
  event: nameSchema.optional(),
};

const parameterSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('string'),
    default: VALUES.string,
    ...shared,
  }),
  z.strictObject({
    type: z.literal('number'),
    default: VALUES.number,
    ...shared,
  }),
  z.strictObject({
    type: z.literal('boolean'),
    default: VALUES.boolean,
    ...shared,
  }),
  z.strictObject({
    type: z.literal('enum'),
    values: z.array(z.string()).min(1),
    default: VALUES.enum,
    ...shared,
  }),
]);

export const parametersSchema = z
  .record(nameSchema, parameterSchema)
  .default({});

export type Declaration = z.infer<typeof parameterSchema>;

export type Declarations = ReadonlyMap<string, Declaration>;

// The environment variable that passes the value of a parameter to the
// scripts
export const variableName = (name: string): string =>
  `DT_PARAM_${name.toUpperCase().replaceAll(/[.-]/g, '_')}`;

const valueSchema = (declaration: Declaration): z.ZodType =>
  declaration.type === 'enum'
    ? z.enum(declaration.values)
    : VALUES[declaration.type];

// Why the value does not fit the declaration, after the subject
const valueProblems = (
  subject: string,
  declaration: Declaration,
  value: unknown,
): string[] =>
  (valueSchema(declaration).safeParse(value).error?.issues ?? []).map(
    ({ message }) => `${subject}: ${message}`,
  );

// The names that share the variable name of an earlier name
function collisions(names: string[]): string[] {
  const owners = new Map<string, string>();
  return names.flatMap((name) => {
    const variable = variableName(name);
    const owner = owners.get(variable) ?? name;
    owners.set(variable, owner);
    return owner === name
      ? []
      : [`parameters ${owner} and ${name} share the variable ${variable}`];
  });
}

type Section = { events: ReadonlySet<string>; parameters: Declarations };

// The problems of the parameters of a definition that their schema can
// not see
export function parameterProblems({ events, parameters }: Section): string[] {
  const entries = [...parameters];
  const defaults = entries.flatMap(([name, declaration]) =>
    valueProblems(
      `parameter ${name} default`,
      declaration,
      declaration.default,
    ),
  );
  const undeclared = entries
    .filter(([, { event }]) => event !== undefined && !events.has(event))
    .map(
      ([name, { event }]) =>
        `parameter ${name} raises undeclared event ${event}`,
    );
  return [...defaults, ...undeclared, ...collisions([...parameters.keys()])];
}

// A declaration as GET /parameters shows it; the event stays internal
const describe = (declaration: Declaration): Omit<ParameterDto, 'value'> => ({
  type: declaration.type,
  ...(declaration.type === 'enum' && { values: declaration.values }),
  default: declaration.default,
  controllable: declaration.controllable,
});

export type ParameterChanges = {
  changes: ReadonlyMap<string, ParameterValue>;
  events: string[];
};

export type ParameterCheck = { problems: string[] } | ParameterChanges;

// The declared parameters of a digital twin and their current values,
// which start at their defaults
export default class Parameters {
  private readonly current: Record<string, ParameterValue>;

  constructor(private readonly declarations: Declarations) {
    this.current = Object.fromEntries(
      [...declarations].map(([name, declaration]) => [
        name,
        declaration.default,
      ]),
    );
  }

  values(): Record<string, ParameterValue> {
    return { ...this.current };
  }

  // The value and the declaration of each parameter, without its event
  document(): ParametersDto {
    return Object.fromEntries(
      [...this.declarations].map(([name, declaration]) => [
        name,
        { value: this.current[name], ...describe(declaration) },
      ]),
    );
  }

  // Validates a body without applying it: the problems of all its
  // entries, or else the values that change and the events that they
  // raise, once each in the order of the declarations
  check(body: ParametersBody): ParameterCheck {
    const entries = Object.entries(body);
    const problems = entries.flatMap(([name, value]) =>
      this.problems(name, value),
    );
    if (problems.length > 0) {
      return { problems };
    }
    const changes = new Map(
      entries.filter(([name, value]) => this.current[name] !== value),
    );
    return { changes, events: this.events(changes) };
  }

  // Applies the whole body or none of it: the changes are stored before
  // they are committed, so that a failing store changes neither. The
  // events of the changes are the caller's to raise.
  apply(
    body: ParametersBody,
    store: (changes: ReadonlyMap<string, ParameterValue>) => void,
  ): { problems: string[]; events: string[] } {
    const result = this.check(body);
    if ('problems' in result) {
      return { problems: result.problems, events: [] };
    }
    store(result.changes);
    this.commit(result.changes);
    return { problems: [], events: result.events };
  }

  commit(changes: ReadonlyMap<string, ParameterValue>): void {
    changes.forEach((value, name) => {
      this.current[name] = value;
    });
  }

  // Takes the stored values of declared parameters that fit their
  // declarations, and returns the names of the others, which keep their
  // defaults
  restore(values: Record<string, ParameterValue>): string[] {
    const entries = Object.entries(values);
    const fits = ([name, value]: [string, ParameterValue]) =>
      this.fits(name, value);
    this.commit(new Map(entries.filter(fits)));
    return entries.filter((entry) => !fits(entry)).map(([name]) => name);
  }

  private fits(name: string, value: ParameterValue): boolean {
    const declaration = this.declarations.get(name);
    return (
      declaration !== undefined &&
      valueProblems(name, declaration, value).length === 0
    );
  }

  private problems(name: string, value: ParameterValue): string[] {
    const declaration = this.declarations.get(name);
    if (declaration === undefined) {
      return [`parameter ${name} is not declared`];
    }
    if (!declaration.controllable) {
      return [`parameter ${name} is not controllable`];
    }
    return valueProblems(`parameter ${name}`, declaration, value);
  }

  private events(changes: ReadonlyMap<string, ParameterValue>): string[] {
    const events = [...this.declarations]
      .filter(([name]) => changes.has(name))
      .flatMap(([, { event }]) => event ?? []);
    return [...new Set(events)];
  }
}
