import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import AppModule from 'src/app.module';
import AppController from 'src/app.controller';
import Access from 'src/auth/access';
import AccessGuard from 'src/auth/access.guard';
import { ACCESS_ROUTE } from 'src/auth/roles';
import Config from 'src/config/configuration.service';
import FsmService from 'src/fsm/fsm.service';
import HealthController from 'src/health.controller';
import { httpAuthorization, newCaller } from 'test/sign.util';

const manager = newCaller('manager-1');

const access = new Access(
  [{ name: 'manager-1', role: 'manager', publicKey: manager.publicKey }],
  'hospital-1',
);

function guard(control: Access | undefined) {
  const config = { access: () => control } as unknown as Config;
  const fsm = {
    declared: () => ({ managerCommands: ['admit'] }),
  } as unknown as FsmService;
  return new AccessGuard(new Reflector(), config, fsm);
}

type Request = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  rawBody?: Buffer;
  principal?: unknown;
};

// A POST / of the command, signed by the manager unless told otherwise
function execute(name: string, signed = true): Request {
  const body = JSON.stringify({ name });
  const call = { method: 'POST', path: '/', body };
  const headers: Record<string, string> = signed
    ? { authorization: httpAuthorization(manager, 'hospital-1', call) }
    : {};
  return { ...call, headers, body: { name }, rawBody: Buffer.from(body) };
}

const context = (handler: unknown, request: Request) =>
  ({
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const status = (attempt: () => unknown): number => {
  try {
    attempt();
  } catch (error) {
    return (error as HttpException).getStatus();
  }
  return 200;
};

const newCommand = AppController.prototype.newCommand;
const unlisted = () => undefined;

describe('Access guard', () => {
  it('Should find an access route on every handler', () => {
    const controllers: Array<{ prototype: object }> = Reflect.getMetadata(
      'controllers',
      AppModule,
    );
    const handlers = controllers.flatMap(({ prototype }) =>
      Object.getOwnPropertyNames(prototype)
        .map((name) => (prototype as Record<string, unknown>)[name])
        .filter((value) =>
          Reflect.hasMetadata(METHOD_METADATA, value as object),
        ),
    );

    expect(handlers.length).toBeGreaterThan(10);
    handlers.forEach((handler) =>
      expect(Reflect.getMetadata(ACCESS_ROUTE, handler as object)).toEqual(
        expect.any(String),
      ),
    );
  });

  it('Should allow every request without access control', () => {
    const open = guard(undefined);

    expect(open.canActivate(context(unlisted, execute('x', false)))).toBe(true);
  });

  it('Should allow a public route without a credential', () => {
    const request = { ...execute('x', false), method: 'GET', path: '/health' };
    const check = HealthController.prototype.check;

    expect(guard(access).canActivate(context(check, request))).toBe(true);
  });

  it('Should refuse a handler without an access route', () => {
    const request = execute('admit');

    expect(
      status(() => guard(access).canActivate(context(unlisted, request))),
    ).toBe(403);
  });

  it('Should pass the principal on to the handler', () => {
    const request = execute('admit');

    expect(guard(access).canActivate(context(newCommand, request))).toBe(true);
    expect(request.principal).toEqual({ name: 'manager-1', role: 'manager' });
  });

  it.each([
    ['a command of a manager that is not listed', execute('open'), 403],
    ['a request without a credential', execute('admit', false), 401],
  ])('Should refuse %s', (_, request, code) => {
    expect(
      status(() => guard(access).canActivate(context(newCommand, request))),
    ).toBe(code);
    expect(request.principal).toBeUndefined();
  });
});
