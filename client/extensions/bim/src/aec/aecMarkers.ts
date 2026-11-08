/**
 * The marker and label the `aec` substrate puts on each anchored object.
 * Both are drawn over the geometry, or a sensor inside a wall is hidden, and
 * both are sized as a share of the model, so they read on any model.
 */

import {
  Box3,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';

const MARKER_SHARE = 0.012;
// At 0.09 a label was read at about 7 pt once the view was shrunk to a
// printed column, smaller than the text around it.
const LABEL_SHARE = 0.13;
const LABEL_FONT_PX = 48;
// Labels sit in the scene, whose background is light in both themes.
const LABEL_BACKGROUND = 'rgba(255, 255, 255, 0.9)';
const LABEL_TEXT = '#1b2430';
/** The marker colour before a value arrives, off every colour ramp. */
export const NO_READING_COLOUR = '#9aa3ad';

export interface Marker {
  readonly name: string;
  readonly globalId: string;
  readonly dot: Mesh;
  readonly label: Sprite;
}

/** Draw `text` on a canvas and size the sprite to `height` model units. */
function writeLabel(sprite: Sprite, text: string, height: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const font = `600 ${LABEL_FONT_PX}px sans-serif`;
  const padding = LABEL_FONT_PX / 3;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width + padding * 2);
  canvas.height = Math.ceil(LABEL_FONT_PX * 1.4);
  context.font = font; // resizing the canvas resets its state
  context.fillStyle = LABEL_BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = LABEL_TEXT;
  context.textBaseline = 'middle';
  context.fillText(text, padding, canvas.height / 2);
  sprite.material.map?.dispose();
  sprite.material.map = new CanvasTexture(canvas);
  sprite.material.needsUpdate = true;
  sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
}

/** Every marker of one model, by the key the substrate gave it. */
export class Markers {
  readonly all = new Map<string, Marker>();

  radius = 1;

  constructor(
    private readonly scene: Scene,
    private readonly changed: () => void,
  ) {}

  private labelHeight() {
    return this.radius * LABEL_SHARE;
  }

  /** A marker with its label on `object`, kept under `key`. */
  add(key: string, object: Object3D, name: string): Marker {
    const globalId = object.userData.globalId as string;
    const at = new Box3().setFromObject(object).getCenter(new Vector3());
    const dot = new Mesh(
      new SphereGeometry(this.radius * MARKER_SHARE, 16, 12),
      new MeshBasicMaterial({ color: NO_READING_COLOUR, depthTest: false }),
    );
    dot.renderOrder = 2;
    dot.position.copy(at);
    const label = new Sprite(new SpriteMaterial({ depthTest: false }));
    label.renderOrder = 3;
    writeLabel(label, name, this.labelHeight());
    label.position.copy(at).add(new Vector3(0, 0, this.labelOffset(at)));
    this.scene.add(dot, label);
    const marker = { name, globalId, dot, label };
    this.all.set(key, marker);
    this.changed();
    return marker;
  }

  /**
   * Where a label sits from its marker, along the depth of the plan: above
   * it, unless a marker close by already has its label above, and then below
   * it, so two neighbouring sensors do not cover each other's label.
   */
  private labelOffset(at: Vector3): number {
    const height = this.labelHeight();
    const crowded = [...this.all.values()].some(
      (m) =>
        m.label.position.z < m.dot.position.z &&
        Math.hypot(m.dot.position.x - at.x, m.dot.position.z - at.z) <
          height * 4,
    );
    return crowded ? height : -height;
  }

  relabel(marker: Marker, text: string) {
    writeLabel(marker.label, text, this.labelHeight());
    this.changed();
  }

  /** Show or hide every marker, for a floor that does not hold them. */
  showOnly(visible: (marker: Marker) => boolean) {
    this.all.forEach((marker) => {
      const shown = visible(marker);
      marker.dot.visible = shown;
      marker.label.visible = shown;
    });
  }
}
