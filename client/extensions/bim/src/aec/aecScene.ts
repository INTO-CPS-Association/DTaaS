/**
 * The three.js side of the `aec` substrate: the canvas, the camera, the
 * model, its appearance and the markers. Loaded only when a pane draws a
 * building, so three.js stays out of the main bundle.
 */

import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Appearance } from './aecAppearance';
import { look, type ViewName } from './aecCamera';
import { Markers } from './aecMarkers';
import { loadTree, type PropertyTree, treeAddress } from './aecTree';

// The same background and lamps as the Buildings page, so a model looks the
// same in both places.
const BACKGROUND = 0xe9edef;
const AMBIENT_LIGHT = 0.75;
const SUN_LIGHT = 0.9;
const FIELD_OF_VIEW = 45;

/** Every mesh of a model, by the IFC GlobalId its GLB carries. */
export function meshesById(model: Object3D): Map<string, Mesh[]> {
  const found = new Map<string, Mesh[]>();
  model.traverse((node) => {
    const mesh = node as Mesh & { isMesh?: boolean };
    const globalId = node.userData?.globalId as string | undefined;
    if (!mesh.isMesh || !globalId) return;
    found.set(globalId, [...(found.get(globalId) ?? []), mesh]);
  });
  return found;
}

function lights(scene: Scene) {
  scene.background = new Color(BACKGROUND);
  scene.add(new AmbientLight(0xffffff, AMBIENT_LIGHT));
  const sun = new DirectionalLight(0xffffff, SUN_LIGHT);
  sun.position.set(5, 10, 7);
  scene.add(sun);
}

/** A model in a canvas, with the options the substrate's controls drive. */
export class AecScene {
  readonly scene = new Scene();

  readonly camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 5000);

  readonly renderer = new WebGLRenderer({ antialias: true });

  readonly controls: OrbitControls;

  readonly markers = new Markers(this.scene, () => this.invalidate());

  meshes = new Map<string, Mesh[]>();

  tree: PropertyTree = {};

  appearance = new Appearance(new Map(), () => undefined);

  private model: Object3D | null = null;

  private running = true;

  // A frame is drawn only when something changed, so an idle pane costs
  // nothing.
  private dirty = true;

  private readonly observer = new ResizeObserver(() => this.resize());

  constructor(private readonly canvasHolder: HTMLElement) {
    lights(this.scene);
    this.renderer.setPixelRatio(globalThis.devicePixelRatio);
    Object.assign(this.renderer.domElement.style, {
      display: 'block',
      width: '100%',
      height: '100%',
    });
    canvasHolder.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.observer.observe(canvasHolder);
    this.resize();
    this.tick();
  }

  private resize() {
    const { clientWidth, clientHeight } = this.canvasHolder;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  /** Draw the scene again on the next frame. */
  invalidate() {
    this.dirty = true;
  }

  private tick() {
    if (!this.running) return;
    // update() reports a camera move, including the damping after a drag.
    if (this.controls.update() || this.dirty) {
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
    }
    globalThis.requestAnimationFrame(() => this.tick());
  }

  /** Load the converted model and the property tree beside it. */
  async load(url: string) {
    const [gltf, tree] = await Promise.all([
      new GLTFLoader().loadAsync(url),
      loadTree(treeAddress(url)),
    ]);
    this.model = gltf.scene;
    this.scene.add(gltf.scene);
    this.tree = tree;
    this.meshes = meshesById(gltf.scene);
    this.appearance = new Appearance(this.meshes, (id) => this.factsOf(id));
    this.look('top');
  }

  factsOf(globalId: string) {
    return this.tree.objects?.[globalId];
  }

  /** The extent of an object along each world axis, in metres (glTF). */
  sizeOf(globalId: string): { x: number; y: number; z: number } | undefined {
    const box = new Box3();
    this.meshes.get(globalId)?.forEach((mesh) => box.expandByObject(mesh));
    if (box.isEmpty()) return undefined;
    const { x, y, z } = box.getSize(new Vector3());
    return { x, y, z };
  }

  /** Look at the whole model from a named view. */
  look(from: ViewName) {
    if (!this.model) return;
    this.markers.radius = look(this.camera, this.controls, this.model, from);
    this.invalidate();
  }

  /** Apply the appearance state to the model and to the markers. */
  refresh() {
    this.appearance.refresh();
    const { storey } = this.appearance.state;
    this.markers.showOnly(
      (m) => !storey || this.factsOf(m.globalId)?.storey === storey,
    );
    this.invalidate();
  }

  /** The GlobalId of the visible object under a point of the page. */
  objectAt(x: number, y: number): string | null {
    const box = this.canvasHolder.getBoundingClientRect();
    const pointer = new Vector2(
      ((x - box.left) / box.width) * 2 - 1,
      -((y - box.top) / box.height) * 2 + 1,
    );
    const ray = new Raycaster();
    ray.setFromCamera(pointer, this.camera);
    const visible = [...this.meshes.values()].flat().filter((m) => m.visible);
    const [hit] = ray.intersectObjects(visible, false);
    return (hit?.object.userData.globalId as string | undefined) ?? null;
  }

  /** The key of the marker on an object, if it carries one. */
  markerOn(globalId: string | null): string | null {
    const hit = [...this.markers.all].find(([, m]) => m.globalId === globalId);
    return hit ? hit[0] : null;
  }

  dispose() {
    this.running = false;
    this.observer.disconnect();
    this.controls.dispose();
    this.appearance.dispose();
    this.scene.traverse((node) => {
      const mesh = node as Partial<Mesh>;
      mesh.geometry?.dispose();
      const material = mesh.material as
        { map?: { dispose(): void } | null; dispose(): void } | undefined;
      material?.map?.dispose();
      material?.dispose();
    });
    this.renderer.dispose();
    // Browsers keep few WebGL contexts, so a closed pane gives its own back.
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
