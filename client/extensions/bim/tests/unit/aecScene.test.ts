import { addControls } from 'src/aec/aecControls';
import { mountOverlay } from 'src/aec/aecOverlay';
import { AecScene } from 'src/aec/aecScene';

// three ships as an ES module jest cannot load. These tests count frames and
// contexts, so the renderer and the orbit controls are the only parts with
// behaviour.
const mockRender = jest.fn();
const mockContextLoss = jest.fn();
const mockUpdate = jest.fn(() => false);

jest.mock('three', () => {
  // A plain object answers every call the scene makes on a three.js part.
  const thing = jest.fn(() => ({
    position: { set: jest.fn() },
    add: jest.fn(),
    traverse: jest.fn(),
    updateProjectionMatrix: jest.fn(),
    dispose: jest.fn(),
  }));
  const renderer = jest.fn(() => ({
    domElement: document.createElement('canvas'),
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    render: mockRender,
    dispose: jest.fn(),
    forceContextLoss: mockContextLoss,
  }));
  return {
    AmbientLight: thing,
    Box3: thing,
    Color: thing,
    DirectionalLight: thing,
    PerspectiveCamera: thing,
    Raycaster: thing,
    Scene: thing,
    Vector2: thing,
    Vector3: thing,
    WebGLRenderer: renderer,
    MeshStandardMaterial: thing,
    DoubleSide: 2,
  };
});
jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn(),
}));
jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn(() => ({ update: mockUpdate, dispose: jest.fn() })),
}));
jest.mock('src/aec/aecOverlay', () => ({
  changes: () => ({ bump: jest.fn(), subscribe: jest.fn(), version: 0 }),
  mountOverlay: jest.fn(() => jest.fn()),
}));

let nextFrame: (() => void) | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    nextFrame = () => callback(0);
    return 0;
  };
  globalThis.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })) as unknown as typeof ResizeObserver;
});

describe('the aec scene', () => {
  it('draws a frame only when something changed', () => {
    const view = new AecScene(document.createElement('div'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    nextFrame?.();
    expect(mockRender).toHaveBeenCalledTimes(1);
    view.invalidate();
    nextFrame?.();
    expect(mockRender).toHaveBeenCalledTimes(2);
    mockUpdate.mockReturnValueOnce(true); // the camera moved
    nextFrame?.();
    expect(mockRender).toHaveBeenCalledTimes(3);
    view.dispose();
  });

  it('gives its WebGL context back when the pane closes', () => {
    new AecScene(document.createElement('div')).dispose();
    expect(mockContextLoss).toHaveBeenCalledTimes(1);
  });
});

describe('the aec controls', () => {
  it('names a sensor the model lacks once, however often it resolves', () => {
    const view = new AecScene(document.createElement('div'));
    const rows = {
      frame: document.createElement('div'),
      above: document.createElement('div'),
      below: document.createElement('div'),
    };
    const controls = addControls(view, rows);
    controls.reportMissing('Seat 48A');
    controls.reportMissing('Seat 48A');
    const [, , model] = jest.mocked(mountOverlay).mock.calls[0];
    expect(model.ui.missing).toEqual(['Seat 48A']);
    view.dispose();
  });
});
