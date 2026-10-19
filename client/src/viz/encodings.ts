/**
 * The evaluators of the encoding vocabulary (layer 4): from the value of a
 * signal at the playhead to the visual properties a substrate applies.
 *
 * They are pure, so the whole chain from a recorded stream to the colours a
 * twin would show is tested without drawing anything, which is the exit test
 * of the first phase in the companion report.
 */

import type {
  Channel,
  Encoding,
  SignalValue,
} from '@into-cps-association/dtaas-sdk';
import { colourAt, position } from 'viz/schemes';

/** The value of the bound signal on one channel, at the playhead. */
export type ValueOn = (channel: Channel) => SignalValue | undefined;

type Properties = Record<string, unknown>;

const numberOf = (value: SignalValue | undefined) =>
  typeof value === 'number' ? value : undefined;

function compare(
  value: SignalValue | undefined,
  when: {
    op: string;
    value: number | string | boolean;
  },
): boolean {
  if (value === undefined || Array.isArray(value)) return false;
  const tests: Record<string, () => boolean> = {
    '<': () => value < when.value,
    '<=': () => value <= when.value,
    '>': () => value > when.value,
    '>=': () => value >= when.value,
    '==': () => value === when.value,
    '!=': () => value !== when.value,
  };
  return tests[when.op]();
}

function format(value: SignalValue | undefined, precision = 1, unit = '') {
  const n = numberOf(value);
  const text = n === undefined ? String(value ?? '') : n.toFixed(precision);
  return unit ? `${text} ${unit}` : text;
}

const scaleColour = (
  value: number | undefined,
  domain: number[],
  scheme: string,
) =>
  value === undefined ? undefined : colourAt(scheme, position(value, domain));

/** An evaluator for each encoding type, typed by that type. */
type Evaluators = {
  [K in Encoding['type']]?: (
    encoding: Extract<Encoding, { type: K }>,
    valueOn: ValueOn,
  ) => Properties;
};

/** One evaluator per encoding type the core draws. */
const EVALUATORS: Evaluators = {
  colorScale: (e, v) => ({
    color: scaleColour(
      numberOf(v(e.channel ?? 'measured')),
      e.domain,
      e.scheme,
    ),
  }),
  regionFill: (e, v) => ({
    fill: scaleColour(numberOf(v('measured')), e.domain, e.scheme),
  }),
  visibility: (e, v) => ({
    visible: compare(v('measured'), e.when),
  }),
  attention: (e, v) => ({
    attention: compare(v('measured'), e.when) ? (e.priority ?? 'medium') : null,
  }),
  label: (e, v) => ({
    text: format(v('measured'), e.precision, e.unit),
  }),
  residual: (e, v) => {
    const [measured, other] = [numberOf(v('measured')), numberOf(v(e.against))];
    const residual =
      measured === undefined || other === undefined
        ? undefined
        : measured - other;
    return {
      residual,
      color: scaleColour(residual, e.domain, e.scheme ?? 'diverging'),
    };
  },
  transform: (e, v) => {
    const n = numberOf(v('measured'));
    const [low, high] = e.range;
    const amount =
      n === undefined ? undefined : low + (high - low) * position(n, e.domain);
    return { [e.property]: { axis: e.axis, amount } };
  },
  ghost: (e, v) => ({
    ghost: v(e.channel),
    opacity: e.opacity ?? 0.4,
  }),
};

/** The visual properties of one encoding, or `{}` for a type not drawn yet. */
export default function evaluate(
  encoding: Encoding,
  valueOn: ValueOn,
): Properties {
  // Indexed by the encoding's own type, so the evaluator takes this encoding.
  const evaluator = EVALUATORS[encoding.type] as
    ((e: Encoding, v: ValueOn) => Properties) | undefined;
  return evaluator ? evaluator(encoding, valueOn) : {};
}
