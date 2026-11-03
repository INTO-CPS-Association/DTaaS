import type { ComponentType } from 'react';
import type { DtaasExtension } from '../extension/extension.types';
import type { DigitalTwinSummary } from '../visualisation/digitalTwin.types';

/** A page-like element to mount, where to mount it, and with which props. */
export interface Mountable {
  readonly label: string;
  /** Route pattern the element is registered under. */
  readonly path: string;
  /** Concrete location the router starts at. */
  readonly route: string;
  readonly element: ComponentType<object>;
  readonly props: object;
}

/** Fills route parameters (`:farm`) with `sample`. */
const sampleRoute = (path: string) => path.replace(/:[^/]+/g, 'sample');

const atRoot = (label: string, element: unknown, props: object): Mountable => ({
  label,
  path: '/',
  route: '/',
  element: element as ComponentType<object>,
  props,
});

const routes = (ext: DtaasExtension): Mountable[] =>
  (ext.routes ?? []).map((route, i) => {
    const path = route.path === '' ? `/${ext.id}` : `/${ext.id}/${route.path}`;
    const label = `routes[${i}] "${route.path}"`;
    return {
      ...atRoot(label, route.element, {}),
      path,
      route: sampleRoute(path),
    };
  });

const tabs = (ext: DtaasExtension, dt: DigitalTwinSummary): Mountable[] =>
  (ext.digitalTwinTabs ?? []).map((tab, i) =>
    atRoot(`digitalTwinTabs[${i}] "${tab.id}"`, tab.element, { dt }),
  );

const previews = (ext: DtaasExtension): Mountable[] =>
  (ext.assetPreviews ?? []).map((preview, i) =>
    atRoot(`assetPreviews[${i}] "${preview.id}"`, preview.element, {
      url: 'https://dtaas.example/lib/sample',
      name: `sample${preview.extensions?.[0] ?? ''}`,
    }),
  );

const inspectorPanel = (ext: DtaasExtension): Mountable[] => {
  const panel = ext.visualisation?.inspectorPanel;
  const selection = { substrate: 'image', id: 'sample' };
  return panel
    ? [atRoot('visualisation.inspectorPanel', panel, { selection })]
    : [];
};

/** Every page-like element an extension contributes, with sample props. */
const collectMountables = (
  ext: DtaasExtension,
  dt: DigitalTwinSummary,
): Mountable[] => [
  ...routes(ext),
  ...tabs(ext, dt),
  ...previews(ext),
  ...inspectorPanel(ext),
];

export default collectMountables;
