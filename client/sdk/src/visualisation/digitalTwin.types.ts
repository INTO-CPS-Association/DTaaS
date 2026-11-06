/** What the host knows about a digital twin when asking a kit about it. */
export interface DigitalTwinSummary {
  readonly name: string;
  /** Library path of the twin's folder. */
  readonly path: string;
  /** Paths of the files in the twin's folder, relative to `path`. */
  readonly files: readonly string[];
  readonly description?: string;
  /** `domain:` from the twin's description front-matter, when present. */
  readonly domain?: string;
}

/** A ThingsBoard device or asset, used to author `tb-entity` anchors. */
export interface TbEntity {
  readonly id: string;
  readonly name: string;
  readonly type: 'DEVICE' | 'ASSET';
  readonly label?: string;
  readonly profile?: string;
}
