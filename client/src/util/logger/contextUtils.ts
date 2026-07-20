import type { LogContext, LogContextValue } from 'util/logger/logEvent';

export const MAX_LOG_CONTEXT_DEPTH = 6;
export const MAX_LOG_CONTEXT_ENTRIES = 100;
export const MAX_LOG_CONTEXT_VALUE_LENGTH = 1024;

const MAX_DEPTH_VALUE = '[context depth limit reached]';

interface WalkBudget {
  remainingEntries: number;
}

interface WalkState {
  depth: number;
  budget: WalkBudget;
}

export interface FlattenedLogContextEntry {
  key: string;
  value: string;
}

function isContextObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPassthroughPrimitive(
  value: unknown,
): value is number | boolean | null {
  return (
    typeof value === 'number' || typeof value === 'boolean' || value === null
  );
}

function useContextEntry(budget: WalkBudget): boolean {
  if (budget.remainingEntries <= 0) return false;
  budget.remainingEntries -= 1;
  return true;
}

function sanitizeContextArray(
  values: unknown[],
  depth: number,
  budget: WalkBudget,
): LogContextValue[] {
  const sanitized: LogContextValue[] = [];
  values.every((value) => {
    if (!useContextEntry(budget)) return false;
    sanitized.push(sanitizeContextValue(value, depth - 1, budget));
    return true;
  });
  return sanitized;
}

function sanitizeContextObject(
  value: Record<string, unknown>,
  depth: number,
  budget: WalkBudget,
): LogContext {
  const sanitized: LogContext = {};
  Object.entries(value).every(([key, nested]) => {
    if (!useContextEntry(budget)) return false;
    sanitized[key] = sanitizeContextValue(nested, depth - 1, budget);
    return true;
  });
  return sanitized;
}

function stringifyLeafValue(value: unknown): string {
  const stringified =
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint' ||
    value === undefined
      ? String(value) // NOSONAR
      : JSON.stringify(value);
  return stringified.slice(0, MAX_LOG_CONTEXT_VALUE_LENGTH);
}

function sanitizeStructuredValue(
  value: unknown,
  depth: number,
  budget: WalkBudget,
): LogContextValue {
  if (Array.isArray(value)) return sanitizeContextArray(value, depth, budget);
  if (isContextObject(value))
    return sanitizeContextObject(value, depth, budget);
  return stringifyLeafValue(value);
}

interface PrimitiveResult {
  handled: boolean;
  value: LogContextValue;
}

function sanitizePrimitiveValue(value: unknown): PrimitiveResult {
  if (typeof value === 'string') {
    return {
      handled: true,
      value: value.slice(0, MAX_LOG_CONTEXT_VALUE_LENGTH),
    };
  }
  if (isPassthroughPrimitive(value)) return { handled: true, value };
  return { handled: false, value: MAX_DEPTH_VALUE };
}

function sanitizeComplexValue(
  value: unknown,
  depth: number,
  budget: WalkBudget,
): LogContextValue {
  if (depth <= 0) return MAX_DEPTH_VALUE;
  return sanitizeStructuredValue(value, depth, budget);
}

function sanitizeContextValue(
  value: unknown,
  depth: number,
  budget: WalkBudget,
): LogContextValue {
  const primitive = sanitizePrimitiveValue(value);
  return primitive.handled
    ? primitive.value
    : sanitizeComplexValue(value, depth, budget);
}

export function sanitizeLogContext(value: unknown): LogContext {
  if (!isContextObject(value)) return {};
  return sanitizeContextObject(value, MAX_LOG_CONTEXT_DEPTH, {
    remainingEntries: MAX_LOG_CONTEXT_ENTRIES,
  });
}

function formatContextValue(value: LogContextValue): string {
  return typeof value === 'object' && value !== null
    ? JSON.stringify(value)
    : String(value);
}

function flattenContextValue(
  key: string,
  value: LogContextValue,
  walk: WalkState,
): FlattenedLogContextEntry[] {
  if (isContextObject(value)) {
    if (walk.depth <= 1) return [{ key, value: MAX_DEPTH_VALUE }];
    return flattenContextObject(
      value,
      { depth: walk.depth - 1, budget: walk.budget },
      key,
    );
  }
  return [{ key, value: formatContextValue(value) }];
}

function flattenContextObject(
  context: LogContext,
  walk: WalkState,
  prefix = '',
): FlattenedLogContextEntry[] {
  return Object.entries(context).flatMap(([key, value]) => {
    if (!useContextEntry(walk.budget)) return [];
    const path = prefix ? `${prefix}.${key}` : key;
    return flattenContextValue(path, value, walk);
  });
}

export function flattenLogContext(
  context: LogContext,
): FlattenedLogContextEntry[] {
  return flattenContextObject(context, {
    depth: MAX_LOG_CONTEXT_DEPTH,
    budget: { remainingEntries: MAX_LOG_CONTEXT_ENTRIES },
  });
}

function collectStructuredText(
  value: LogContextValue,
  depth: number,
  budget: WalkBudget,
): string[] {
  if (Array.isArray(value)) return collectTextArray(value, depth, budget);
  if (isContextObject(value)) return collectTextObject(value, depth, budget);
  return [String(value)];
}

function canCollectText(value: LogContextValue, depth: number): boolean {
  if (value === null) return false;
  return depth > 0;
}

function collectTextValue(
  value: LogContextValue,
  depth: number,
  budget: WalkBudget,
): string[] {
  return canCollectText(value, depth)
    ? collectStructuredText(value, depth, budget)
    : [];
}

function collectTextArray(
  values: LogContextValue[],
  depth: number,
  budget: WalkBudget,
): string[] {
  return values.flatMap((value) =>
    useContextEntry(budget) ? collectTextValue(value, depth - 1, budget) : [],
  );
}

function collectTextObject(
  context: LogContext,
  depth: number,
  budget: WalkBudget,
): string[] {
  return Object.entries(context).flatMap(([key, value]) =>
    useContextEntry(budget)
      ? [key, ...collectTextValue(value, depth - 1, budget)]
      : [],
  );
}

export function collectLogContextText(context: LogContext): string[] {
  return collectTextObject(context, MAX_LOG_CONTEXT_DEPTH, {
    remainingEntries: MAX_LOG_CONTEXT_ENTRIES,
  });
}
