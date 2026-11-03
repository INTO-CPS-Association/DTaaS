/**
 * The visualisation service of the common core (layers 3 to 5).
 *
 * A twin's visualisation is a `visualisation.json` in its own library folder,
 * a DT asset like any other: read and written through the workspace, and
 * checked against the SDK schema both ways, so a broken file is reported and
 * never drawn half-way. Saving through a merge request needs the GitLab
 * persistence of a later step, and is refused until then.
 *
 * The anchor kinds, presets and substrates are the ones the enabled
 * extensions contribute, next to the standard substrates of the core.
 */

import type {
  ContentsService,
  DigitalTwinSummary,
  DtaasExtension,
  HostServices,
  SaveOptions,
  VisualisationAsset,
  VizService,
} from '@into-cps-association/dtaas-sdk';
import { parseVisualisationAsset } from '@into-cps-association/dtaas-sdk/schema';
import STANDARD from 'viz/substrates';

export const VISUALISATION_FILE = 'visualisation.json';

const fileOf = (dt: DigitalTwinSummary) => `${dt.path}/${VISUALISATION_FILE}`;

function parsed(json: unknown, where: string) {
  const result = parseVisualisationAsset(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`${where}: ${issue.path.join('.')} ${issue.message}`);
  }
  return result.data;
}

function contributions(extensions: readonly DtaasExtension[]) {
  const viz = extensions.flatMap((ext) =>
    ext.visualisation ? [ext.visualisation] : [],
  );
  return {
    anchorKinds: viz.flatMap((v) => v.anchorKinds ?? []),
    presets: viz.flatMap((v) => v.presets ?? []),
    // A standard substrate is the core's own, and an extension's copy of it
    // is never drawn, so it is left out of the list too.
    substrates: viz
      .flatMap((v) => v.substrates ?? [])
      .filter((spec) => !STANDARD[spec.id]),
  };
}

async function load(contents: ContentsService, dt: DigitalTwinSummary) {
  if (!(await contents.exists(fileOf(dt)))) return null;
  const text = new TextDecoder().decode(await contents.get(fileOf(dt)));
  return parsed(JSON.parse(text), fileOf(dt));
}

async function save(
  contents: ContentsService,
  dt: DigitalTwinSummary,
  asset: VisualisationAsset,
  options?: SaveOptions,
) {
  if (options?.viaMergeRequest) {
    throw new Error(
      'Saving a visualisation as a merge request is not available yet',
    );
  }
  const checked = parsed(asset, fileOf(dt));
  const bytes = new TextEncoder().encode(
    `${JSON.stringify(checked, null, 2)}\n`,
  );
  await contents.put(fileOf(dt), bytes);
}

/** The standard substrates first, then those the extensions contribute. */
function substrateRegistry(
  substrates: ReturnType<typeof contributions>['substrates'],
  host: () => HostServices,
): VizService['substrates'] {
  return {
    list: () => [...Object.keys(STANDARD), ...substrates.map((s) => s.id)],
    async get(id) {
      if (STANDARD[id]) return STANDARD[id](host());
      const spec = substrates.find((s) => s.id === id);
      if (!spec) throw new Error(`No substrate ${id} is registered`);
      const factory = (await spec.load()).default;
      return factory(host());
    },
  };
}

export default function createVizService(
  contents: ContentsService,
  extensions: readonly DtaasExtension[],
  host: () => HostServices,
): VizService {
  const { anchorKinds, presets, substrates } = contributions(extensions);
  return {
    load: (dt) => load(contents, dt),
    save: (dt, asset, options) => save(contents, dt, asset, options),
    substrates: substrateRegistry(substrates, host),
    anchorKinds,
    presets,
  };
}
