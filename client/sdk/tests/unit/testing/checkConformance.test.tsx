import { lazy, type ReactElement, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import checkConformance from 'src/testing/checkConformance';
import fakeHostServices from 'src/testing/fakeHostServices';
import { useHost } from 'src/host/HostProvider';
import type { DtaasExtension, LazyPage } from 'src/index';
import { looseExtension, validExtension } from 'tests/fixtures/extensions';

const lazyOf = (Component: () => ReactElement | null) =>
  lazy(async () => ({ default: Component }));

const withRoute = (element: LazyPage): DtaasExtension => ({
  ...validExtension(),
  routes: [{ path: 'page', element }],
});

describe('checkConformance', () => {
  it('passes a valid extension', async () => {
    await expect(checkConformance(validExtension())).resolves.toEqual({
      passed: true,
      errors: [],
    });
  });

  it('reports validation errors without mounting anything', async () => {
    const ext = { ...looseExtension(), id: 'Bad' };
    const report = await checkConformance(ext as DtaasExtension);
    expect(report).toEqual({
      passed: false,
      errors: ['id must be a string matching ^[a-z][a-z0-9-]*$'],
    });
  });

  it('reports a preset whose encodings break the schema', async () => {
    const ext = looseExtension();
    ext.visualisation.presets[0].encodings[0].encoding = { type: 'sparkle' };
    const report = await checkConformance(ext as DtaasExtension);
    expect(report.passed).toBe(false);
    expect(report.errors[0]).toMatch(
      /^visualisation\.presets\[0\] "demo\.pressure": encodings\.0\.encoding\.type: /,
    );
  });

  it('runs setup with the host and reports a failing setup', async () => {
    const host = fakeHostServices();
    const ok = await checkConformance(
      { ...validExtension(), setup: (h) => h.logger.info('ready') },
      { host },
    );
    expect(ok.passed).toBe(true);
    expect(host.recorded.logs).toEqual([{ level: 'info', args: ['ready'] }]);
    const failed = await checkConformance({
      ...validExtension(),
      setup: async () => {
        throw new Error('no broker');
      },
    });
    expect(failed.errors).toEqual(['setup() failed: no broker']);
  });

  it('mounts routes under /<id>/<path> with router params', async () => {
    const seen: string[] = [];
    function Page() {
      const { farm } = useParams();
      seen.push(`${useHost().auth.useUser()?.username}:${farm}`);
      return <p>farm</p>;
    }
    const ext = {
      ...validExtension(),
      routes: [{ path: 'farm/:farm', element: lazyOf(Page) }],
    };
    await expect(checkConformance(ext)).resolves.toMatchObject({
      passed: true,
    });
    expect(seen).toContain('user:sample');
  });

  it('reports a page that throws while rendering', async () => {
    const report = await checkConformance(
      withRoute(
        lazyOf(() => {
          throw new Error('boom');
        }),
      ),
    );
    expect(report.errors).toEqual(['routes[0] "page": boom']);
  });

  it('reports a lazy import that rejects', async () => {
    const broken = lazy(async () => {
      throw new Error('chunk missing');
    });
    const report = await checkConformance(withRoute(broken));
    expect(report.errors).toEqual(['routes[0] "page": chunk missing']);
  });

  it('reports a page that never finishes loading', async () => {
    const never = lazy(() => new Promise<never>(() => {}));
    const minimal: DtaasExtension = {
      id: 'slow',
      name: 'Slow',
      version: '1.0.0',
      sdk: 1,
      routes: [{ path: 'page', element: never }],
    };
    const report = await checkConformance(minimal, { timeoutMs: 50 });
    expect(report.errors).toEqual([
      'routes[0] "page": did not finish loading within 50 ms',
    ]);
  });

  it('fails a kit whose page opens its own socket', async () => {
    function Page() {
      useEffect(() => {
        const socket = new WebSocket('wss://rabbitmq/ws');
        return () => socket.close();
      }, []);
      return <p>live</p>;
    }
    const report = await checkConformance(withRoute(lazyOf(Page)));
    expect(report.errors).toEqual([
      'opened a socket to wss://rabbitmq/ws; use HostServices.signals instead',
    ]);
  });

  it('mounts digital twin tabs, asset previews and the inspector panel', async () => {
    const mounted: string[] = [];
    const ext = looseExtension();
    ext.digitalTwinTabs[0].element = lazy(async () => ({
      default: ({ dt }: { dt: { name: string } }) => {
        mounted.push(`tab:${dt.name}`);
        return null;
      },
    }));
    ext.assetPreviews[0].element = lazy(async () => ({
      default: ({ name }: { name: string }) => {
        mounted.push(`preview:${name}`);
        return null;
      },
    }));
    ext.visualisation.inspectorPanel = lazy(async () => ({
      default: ({ selection }: { selection: { id: string } }) => {
        mounted.push(`inspector:${selection.id}`);
        return null;
      },
    }));
    const report = await checkConformance(ext as DtaasExtension, {
      dt: { name: 'twin', path: 'digital_twins/twin', files: [] },
    });
    expect(report.passed).toBe(true);
    expect(new Set(mounted)).toEqual(
      new Set(['tab:twin', 'preview:sample.inp', 'inspector:sample']),
    );
  });
});
