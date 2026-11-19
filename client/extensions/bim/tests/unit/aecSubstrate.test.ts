import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import { modelAddress, sensorName } from 'src/aec/aecModel';
import createAecSubstrate from 'src/aec/aecSubstrate';

describe('the aec substrate', () => {
  it('reads a bare IFC name as the GLB beside it in the models folder', () => {
    expect(modelAddress('room.ifc', 'common/models')).toBe(
      'lib://common/models/room.glb',
    );
  });

  it('uses a lib:// or web address as it is', () => {
    expect(modelAddress('lib://digital_twins/x/room.glb', 'm')).toBe(
      'lib://digital_twins/x/room.glb',
    );
    expect(modelAddress('https://example.org/room.glb', 'm')).toBe(
      'https://example.org/room.glb',
    );
  });

  it('refuses a model name that could leave the models folder', () => {
    expect(() => modelAddress('../other/room.ifc', 'm')).toThrow();
    expect(() => modelAddress('sub/room.ifc', 'm')).toThrow();
  });

  it('shows a sensor by its label, or else by its whole signal path', () => {
    const path = 'site/building/room/device/temperature';
    expect(sensorName(path, 'Seat 48A')).toBe('Seat 48A');
    expect(sensorName(path)).toBe(path);
  });

  it('is a standard substrate for IFC GlobalId anchors', () => {
    const adapter = createAecSubstrate(fakeHostServices());
    expect(adapter.id).toBe('aec');
    expect(adapter.supports).toEqual(['ifc-guid']);
  });

  it('refuses to mount without a model, and resolves nothing before one', async () => {
    const adapter = createAecSubstrate(fakeHostServices());
    await expect(
      adapter.mount(document.createElement('div'), { adapter: 'aec' }),
    ).rejects.toThrow('needs a model');
    const anchor = { signalPath: 'a/b', kind: 'ifc-guid', ref: 'x' };
    expect(adapter.resolve(anchor)).toBeNull();
    expect(adapter.pick(0, 0)).toBeNull();
  });
});
