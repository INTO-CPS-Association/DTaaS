import { act, screen } from '@testing-library/react';
import {
  checkConformance,
  fakeHostServices,
  renderWithHost,
} from '@into-cps-association/dtaas-sdk/testing';
import {
  validateExtension,
  type SignalSample,
} from '@into-cps-association/dtaas-sdk';
import extension from 'examples/hello-kit/src/dtaas';
import HelloPage from 'examples/hello-kit/src/dtaas/pages/HelloPage';

const env = { REACT_APP_EXT_HELLO_GREETING: 'Hej' };

const reading = (ts: number, value: number): SignalSample => ({
  twinId: 'hello',
  signalPath: 'hello/room1/temperature',
  channel: 'measured',
  ts,
  value,
});

describe('hello-kit', () => {
  it('passes static validation', () => {
    expect(validateExtension(extension)).toEqual({ valid: true, errors: [] });
  });

  it('passes the conformance harness', async () => {
    const host = fakeHostServices({ extensionId: 'hello', env });
    await expect(checkConformance(extension, { host })).resolves.toEqual({
      passed: true,
      errors: [],
    });
    expect(host.recorded.logs).toContainEqual({
      level: 'info',
      args: ['hello-kit ready'],
    });
  });

  it('fails conformance when its configuration is missing', async () => {
    const report = await checkConformance(extension);
    expect(report.errors[0]).toMatch(
      /^setup\(\) failed: Invalid configuration for extension "hello"/,
    );
  });

  it('shows the reading at the playhead through the host', () => {
    const host = fakeHostServices({
      extensionId: 'hello',
      env,
      user: { username: 'ada' },
    });
    host.signals.emit(reading(1000, 20.5), reading(2000, 22.25));
    host.signals.playhead.set(1500);
    renderWithHost(<HelloPage />, { host });
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByText('Hej, ada')).toBeInTheDocument();
    expect(screen.getByText('Room 1: 20.5 °C')).toBeInTheDocument();
    act(() => host.signals.playhead.set(2000));
    expect(screen.getByText('Room 1: 22.3 °C')).toBeInTheDocument();
  });

  it('says so when there is no reading yet', () => {
    const host = fakeHostServices({ extensionId: 'hello', env });
    renderWithHost(<HelloPage />, { host });
    expect(screen.getByText('Room 1: no reading')).toBeInTheDocument();
  });

  it('claims twins with .hello files or the hello domain', async () => {
    const detect = extension.visualisation?.detect;
    const twin = (files: string[], domain?: string) => ({
      name: 't',
      path: 'p',
      files,
      domain,
    });
    expect(await detect?.(twin(['model.hello']))).toBe(true);
    expect(await detect?.(twin([], 'hello'))).toBe(true);
    expect(await detect?.(twin(['model.ifc']))).toBe(false);
  });

  it('resolves hello-node anchors on a substrate', () => {
    const [kind] = extension.visualisation?.anchorKinds ?? [];
    const adapter = { id: 'image' } as Parameters<typeof kind.resolve>[1];
    const anchor = {
      signalPath: 'hello/room1/temperature',
      kind: 'hello-node',
      ref: 'node:room1',
    };
    expect(kind.validateRef?.('node:room1')).toBe(true);
    expect(kind.validateRef?.('room1')).toBe(false);
    expect(kind.resolve(anchor, adapter)).toEqual({
      substrate: 'image',
      id: 'room1',
    });
    expect(kind.resolve({ ...anchor, ref: 'bad' }, adapter)).toBeNull();
  });
});
