import { Appearance, isShown, initialState } from 'src/aec/aecAppearance';
import { MarkerColours } from 'src/aec/aecColours';
import { handleKey, type OptionContext } from 'src/aec/aecShortcuts';
import { loadTree, storeysOf, treeAddress } from 'src/aec/aecTree';

// three ships as an ES module jest cannot load, and these tests need none of
// its drawing: a material here only has to be a distinct object.
jest.mock('three', () => ({
  Color: jest.fn(),
  DoubleSide: 2,
  MeshStandardMaterial: class {
    dispose = jest.fn();
  },
}));

const contextWith = (state = initialState()): OptionContext => ({
  state,
  hidden: [],
  colours: new MarkerColours(),
  refresh: jest.fn(),
  look: jest.fn(),
  reset: jest.fn(),
  toggleHelp: jest.fn(),
  toggleFullscreen: jest.fn(),
});

const key = (k: string, target: HTMLElement = document.body) => {
  const event = new KeyboardEvent('keydown', { key: k });
  Object.defineProperty(event, 'target', { value: target });
  return event;
};

describe('the property tree of an aec model', () => {
  it('sits beside the converted model', () => {
    expect(treeAddress('lib://common/models/room.glb')).toBe(
      'lib://common/models/room.json',
    );
  });

  it('offers only the floors that hold objects, lowest first', () => {
    const tree = {
      storeys: [
        { name: 'L2', elevation_m: 6 },
        { name: 'L1', elevation_m: 0 },
        { name: 'Empty', elevation_m: 3 },
      ],
      objects: { a: { storey: 'L2' }, b: { storey: 'L1' }, c: { storey: 'X' } },
    };
    expect(storeysOf(tree)).toEqual(['L1', 'L2', 'X']);
    expect(storeysOf({})).toEqual([]);
  });

  it('is empty when the file is missing', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(loadTree('x.json')).resolves.toEqual({});
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(loadTree('x.json')).resolves.toEqual({});
  });
});

describe('the appearance of an aec model', () => {
  it('shows only the chosen floor, and hides lids on request', () => {
    const state = { ...initialState(), storey: 'L1' };
    expect(isShown('IfcWall', { storey: 'L1' }, state)).toBe(true);
    expect(isShown('IfcWall', { storey: 'L2' }, state)).toBe(false);
    state.lidsHidden = true;
    expect(isShown('IfcSlab', { storey: 'L1' }, state)).toBe(false);
  });

  it('paints the selection and hides objects hidden by hand', () => {
    const base = { clone: jest.fn() };
    const wall = {
      material: base,
      userData: { ifcClass: 'IfcWall' },
      visible: true,
    };
    const meshes = new Map([['w', [wall as never]]]);
    const look = new Appearance(meshes, () => undefined);
    look.state.selected = 'w';
    look.refresh();
    expect(wall.material).not.toBe(base);
    look.state.selected = null;
    look.hidden.push('w');
    look.refresh();
    expect(wall).toMatchObject({ material: base, visible: false });
  });
});

describe('the options of the aec substrate', () => {
  it('toggles transparency with T and ignores keys typed in a field', () => {
    const context = contextWith();
    expect(handleKey(key('t'), context)).toBe(true);
    expect(context.state.transparent).toBe(true);
    expect(handleKey(key('t', document.createElement('input')), context)).toBe(
      false,
    );
    expect(handleKey(key('z'), context)).toBe(false);
  });

  it('looks from above with 1 and hides the hovered object with Q', () => {
    const context = contextWith({ ...initialState(), hovered: 'o' });
    handleKey(key('1'), context);
    handleKey(key('q'), context);
    expect(context.look).toHaveBeenCalledWith('top');
    expect(context.hidden).toEqual(['o']);
  });

  it('cycles the marker colours with M and goes fullscreen with A', () => {
    const context = contextWith();
    handleKey(key('m'), context);
    expect(context.colours.mode).toBe('off');
    handleKey(key('a'), context);
    expect(context.toggleFullscreen).toHaveBeenCalled();
  });
});

describe('the class legend of an aec model', () => {
  const mesh = (ifcClass: string, hex: string) => ({
    material: { color: { getHexString: () => hex } },
    userData: { ifcClass },
    visible: true,
  });

  it('counts the objects of each class with the colour they arrived in', () => {
    const meshes = new Map([
      ['w1', [mesh('IfcWall', 'aaaaaa') as never]],
      ['w2', [mesh('IfcWall', 'aaaaaa') as never]],
      ['d1', [mesh('IfcDoor', '884400') as never]],
    ]);
    const look = new Appearance(meshes, () => undefined);
    expect(look.classes()).toEqual([
      { ifcClass: 'IfcDoor', colour: '#884400', count: 1 },
      { ifcClass: 'IfcWall', colour: '#aaaaaa', count: 2 },
    ]);
  });

  it('lights every object of the class picked in the legend', () => {
    const wall = mesh('IfcWall', 'aaaaaa');
    const base = wall.material;
    const look = new Appearance(
      new Map([['w', [wall as never]]]),
      () => undefined,
    );
    look.state.highlightedClass = 'IfcWall';
    look.refresh();
    expect(wall.material).not.toBe(base);
    look.reset();
    expect(wall.material).toBe(base);
  });
});
