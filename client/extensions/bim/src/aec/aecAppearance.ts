/**
 * What every object of the model looks like, decided in one place: the floor
 * shown, the see-through shell, hidden slabs and roofs, objects hidden by
 * hand, the class picked in the legend, the selection and the hover. Only
 * `refresh` writes `visible` and `material`, so two options can never undo
 * each other. The colours and the
 * set of shell classes are the Buildings page's.
 */

import {
  Color,
  DoubleSide,
  type Material,
  type Mesh,
  MeshStandardMaterial,
} from 'three';
import type { ObjectFacts } from './aecTree';

export const SELECTED_COLOUR = 0xffff00;
export const HOVERED_COLOUR = 0xa3f1ff;
/** Every object of the class picked in the legend. */
export const HIGHLIGHTED_COLOUR = 0x8b5cf6;
const GHOST_OPACITY = 0.14;

/** The shell of a building: what makes it opaque from outside. */
export const SHELL = new Set([
  'IfcWall',
  'IfcWallStandardCase',
  'IfcSlab',
  'IfcRoof',
  'IfcCurtainWall',
  'IfcPlate',
  'IfcMember',
  'IfcCovering',
  'IfcWindow',
  'IfcDoor',
  'IfcRailing',
]);

/** Slabs, roofs and ceilings: what stops a floor being seen into. */
export const LIDS = new Set(['IfcSlab', 'IfcRoof', 'IfcCovering']);

export interface ViewState {
  storey: string | null;
  transparent: boolean;
  lidsHidden: boolean;
  hoverHighlight: boolean;
  selected: string | null;
  hovered: string | null;
  highlightedClass: string | null;
}

/** One row of the class legend: a class, its colour and how many objects. */
export interface ClassEntry {
  readonly ifcClass: string;
  readonly colour: string;
  readonly count: number;
}

export const initialState = (): ViewState => ({
  storey: null,
  transparent: false,
  lidsHidden: false,
  hoverHighlight: true,
  selected: null,
  hovered: null,
  highlightedClass: null,
});

/** Whether an object is drawn, by the floor and the lid options. */
export function isShown(
  ifcClass: string | undefined,
  facts: ObjectFacts | undefined,
  state: ViewState,
): boolean {
  if (state.storey && facts?.storey !== state.storey) return false;
  return !(state.lidsHidden && ifcClass && LIDS.has(ifcClass));
}

function highlight(colour: number) {
  return new MeshStandardMaterial({
    color: new Color(colour),
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  });
}

/** The colour of a material as a CSS colour, grey when it has none. */
function colourOf(material: Material | Material[] | undefined): string {
  const first = (Array.isArray(material) ? material[0] : material) as
    { color?: Color } | undefined;
  return first?.color ? `#${first.color.getHexString()}` : '#9e9e9e';
}

/** The materials every object is painted with, made once. */
export class Appearance {
  readonly state = initialState();

  readonly hidden: string[] = [];

  private readonly base = new Map<Mesh, Material | Material[]>();

  private readonly ghosts = new Map<Material, Material>();

  private readonly selected = highlight(SELECTED_COLOUR);

  private readonly hovered = highlight(HOVERED_COLOUR);

  private readonly highlighted = new MeshStandardMaterial({
    color: new Color(HIGHLIGHTED_COLOUR),
    side: DoubleSide,
  });

  constructor(
    private readonly meshes: ReadonlyMap<string, readonly Mesh[]>,
    private readonly factsOf: (globalId: string) => ObjectFacts | undefined,
  ) {
    meshes.forEach((list) => list.forEach((m) => this.base.set(m, m.material)));
  }

  classOf(globalId: string): string | undefined {
    const mesh = this.meshes.get(globalId)?.[0];
    const fromModel = mesh?.userData.ifcClass as string | undefined;
    return fromModel ?? this.factsOf(globalId)?.ifcClass;
  }

  private ghostOf(material: Material): Material {
    let ghost = this.ghosts.get(material);
    if (!ghost) {
      ghost = material.clone();
      Object.assign(ghost, { transparent: true, opacity: GHOST_OPACITY });
      ghost.depthWrite = false;
      this.ghosts.set(material, ghost);
    }
    return ghost;
  }

  private materialFor(globalId: string, mesh: Mesh) {
    const { state } = this;
    if (globalId === state.selected) return this.selected;
    if (state.hoverHighlight && globalId === state.hovered) return this.hovered;
    const ifcClass = this.classOf(globalId) ?? '';
    if (ifcClass === state.highlightedClass) return this.highlighted;
    const base = this.base.get(mesh) ?? mesh.material;
    const shell = SHELL.has(ifcClass);
    if (!state.transparent || !shell || Array.isArray(base)) return base;
    return this.ghostOf(base);
  }

  /** Apply the state to every object. */
  refresh() {
    this.meshes.forEach((list, globalId) => {
      const facts = this.factsOf(globalId);
      const shown =
        isShown(this.classOf(globalId), facts, this.state) &&
        !this.hidden.includes(globalId);
      list.forEach((mesh) => {
        Object.assign(mesh, { visible: shown });
        Object.assign(mesh, { material: this.materialFor(globalId, mesh) });
      });
    });
  }

  /**
   * The colour the model gives each class and how many objects it holds,
   * read from the materials it arrived with, sorted by class.
   */
  classes(): ClassEntry[] {
    const found = new Map<string, ClassEntry>();
    this.meshes.forEach(([mesh], globalId) => {
      const ifcClass = this.classOf(globalId);
      if (!ifcClass || !mesh) return;
      const known = found.get(ifcClass);
      const colour = known?.colour ?? colourOf(this.base.get(mesh));
      found.set(ifcClass, { ifcClass, colour, count: (known?.count ?? 0) + 1 });
    });
    return [...found.values()].sort((a, b) =>
      a.ifcClass.localeCompare(b.ifcClass),
    );
  }

  /** Back to the model as it opened. */
  reset() {
    Object.assign(this.state, initialState());
    this.hidden.length = 0;
    this.refresh();
  }

  dispose() {
    const own = [this.selected, this.hovered, this.highlighted];
    [...own, ...this.ghosts.values()].forEach((m) => m.dispose());
  }
}
