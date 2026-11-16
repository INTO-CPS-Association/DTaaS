import { ForbiddenException, SetMetadata } from '@nestjs/common';
import { MqttRoute } from '../mqtt/mqtt.config.js';
import { Principal, Role } from './auth.config.js';

// The roles that may call a route, or public for a route that needs no
// credential at all
export type RouteRoles = readonly Role[] | 'public';

const EVERY_ROLE: readonly Role[] = ['client', 'manager', 'script'];

// One row for each route, which HTTP and MQTT share; a manager may
// execute only the commands of manager.commands
export const ROUTE_ROLES: Record<MqttRoute, RouteRoles> = {
  health: 'public',
  dt: EVERY_ROLE,
  state: EVERY_ROLE,
  status: EVERY_ROLE,
  history: EVERY_ROLE,
  metrics: EVERY_ROLE,
  fsm: EVERY_ROLE,
  parameters: EVERY_ROLE,
  execute: ['client', 'manager'],
  stop: ['client'],
  transition: ['client'],
  event: ['client', 'script'],
  escalate: ['client', 'script'],
  'set-parameters': ['client', 'manager'],
  peers: EVERY_ROLE,
  'set-peers': ['client', 'manager'],
};

export const ACCESS_ROUTE = 'accessRoute';

// Names the row of ROUTE_ROLES that guards an HTTP handler
export const AccessRoute = (route: MqttRoute) =>
  SetMetadata(ACCESS_ROUTE, route);

const managerExecutes = (role: Role, route: MqttRoute): boolean =>
  role === 'manager' && route === 'execute';

// Whether the body asks to execute one of manager.commands
export const listedCommand = (
  commands: readonly string[],
  body: unknown,
): boolean => {
  const name = (body as { name?: unknown } | null | undefined)?.name;
  return typeof name === 'string' && commands.includes(name);
};

// Refuses the principal the route with a 403; listed tells whether the
// command of an execute request is one of manager.commands
export function authorize(
  { role }: Principal,
  route: MqttRoute,
  listed: boolean,
): void {
  const roles = ROUTE_ROLES[route];
  const allowed =
    roles === 'public' ||
    (roles.includes(role) && (listed || !managerExecutes(role, route)));
  if (!allowed) {
    throw new ForbiddenException(`${role} may not call ${route}`);
  }
}
