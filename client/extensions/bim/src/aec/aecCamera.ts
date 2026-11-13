/**
 * Where the camera of the `aec` substrate looks from. The named views and
 * their keys follow the Buildings page, so a person moving between the two
 * keeps the same habits.
 */

import { Box3, type Object3D, type PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** A direction from the centre of the model, for each named view. */
export const VIEWS = {
  top: [0, 1, 0.001],
  front: [0, 0, 1],
  side: [1, 0, 0],
  corner: [1, 0.6, 1],
} as const;

export type ViewName = keyof typeof VIEWS;

/**
 * Put the whole model in shot from one named view, and return the radius of
 * the model, which sizes the markers and labels.
 */
export function look(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  model: Object3D,
  from: ViewName,
): number {
  const box = new Box3().setFromObject(model);
  if (box.isEmpty()) return 1;
  const centre = box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const distance = radius / Math.sin((camera.fov * Math.PI) / 360) + 1;
  const direction = new Vector3(...VIEWS[from]).normalize();
  camera.position.copy(centre).add(direction.multiplyScalar(distance));
  // Both depth planes follow the model, as on the Buildings page, so
  // coplanar faces of an IFC model do not flicker.
  camera.near = Math.max(distance / 1000, 0.1);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  controls.target.copy(centre);
  controls.update();
  return radius;
}
