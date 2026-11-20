import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Config from 'src/config/configuration.service';
import Keyv from 'keyv';
import resolveFile from 'src/config/util';

const options = async (configFile: string): Promise<Keyv> => {
  const keyv = new Keyv();
  await keyv.set('configFile', configFile);
  return keyv;
};

describe('Check Configuration Service', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
  });

  it('Should create a valid config object', async () => {
    expect(config).toBeInstanceOf(Config);
  });

  it('Should have correct default config after creation', async () => {
    expect(config.getId()).toEqual('runner');
    expect(config.getAttributes()).toEqual({});
    expect(config.getPort()).toEqual(5000);
    expect(config.permitCommands()).toHaveLength(0);
    expect(config.getLocation()).toEqual('script');
    expect(config.getStateMachine()).toBeUndefined();
    expect(config.getMqtt()).toBeUndefined();
    expect(config.getStopGrace()).toEqual(5000);
    expect(config.getPeers()).toEqual([]);
  });

  it('Should load correct configuration', async () => {
    const CLIOptions = await options('runner.test.yaml');
    const spyOnCLIOptions = jest.spyOn(CLIOptions, 'get');

    await config.loadConfig(CLIOptions);

    expect(config.getId()).toEqual('test-runner');
    expect(config.getAttributes()).toEqual({});
    expect(config.getPort()).toEqual(5002);
    expect(config.permitCommands()).toEqual([
      'create',
      'loop',
      'ignore-term',
      'echo-input',
      'fail',
      'busy',
    ]);
    expect(config.getLocation()).toEqual(resolveFile('script'));
    expect(config.getStateMachine()).toBeUndefined();
    expect(spyOnCLIOptions).toHaveBeenCalled();
    expect(config.getDatabase()).toBeUndefined();
    expect(config.getMqtt()).toBeUndefined();
    expect(config.getStopGrace()).toEqual(500);
  });

  it('Should load the MQTT configuration', async () => {
    await config.loadConfig(await options('test/data/config/runner.mqtt.yaml'));

    expect(config.getDatabase()).toEqual(
      resolveFile('test/data/config/runner.db'),
    );
    expect(config.getStateMachine()).toBeUndefined();
    expect(config.getMqtt()).toEqual({
      url: 'mqtt://localhost:1883',
      topic: 'dtaas/runner',
      protocolVersion: 5,
    });
  });

  it('Should reject an invalid MQTT configuration', async () => {
    const file = 'test/data/config/runner.mqtt.invalid.yaml';

    await expect(config.loadConfig(await options(file))).rejects.toThrow(
      /Invalid configuration in .*runner.mqtt.invalid.yaml:[\s\S]*wildcards[\s\S]*at mqtt.topic/,
    );
  });

  describe('with a configuration of its own', () => {
    let dir: string;

    const load = async (text: string) => {
      writeFileSync(join(dir, 'runner.yaml'), text);
      await config.loadConfig(await options(join(dir, 'runner.yaml')));
    };

    const base = 'port: 5000\nlocation: .\ncommands: [create]\n';

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'runner-config-'));
    });

    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('Should read the attributes', async () => {
      await load(`${base}id: dt-1\nattributes: {city: Aarhus, beds: 120}`);

      expect(config.getId()).toEqual('dt-1');
      expect(config.getAttributes()).toEqual({ city: 'Aarhus', beds: 120 });
    });

    it('Should reject a __proto__ attribute', async () => {
      await expect(
        load(`${base}id: dt-1\nattributes: {__proto__: 1}`),
      ).rejects.toThrow(/Invalid configuration[\s\S]*__proto__/);
    });

    it('Should read the peers', async () => {
      await load(`${base}id: dt-1\npeers: [{id: dt-2, topic: dtaas/dt-2}]`);

      expect(config.getPeers()).toEqual([
        { id: 'dt-2', topic: 'dtaas/dt-2', attributes: {}, enabled: true },
      ]);
    });

    it('Should reject a __proto__ attribute of a peer', async () => {
      await expect(
        load(
          `${base}id: dt-1\npeers:\n  - {id: dt-2, url: 'http://dt-2'}\n` +
            '  - {id: dt-3, url: "http://dt-3", attributes: {__proto__: 1}}',
        ),
      ).rejects.toThrow(/__proto__[\s\S]*at peers.1.attributes/);
    });

    it('Should name the file when it is empty or not YAML', async () => {
      await expect(load('# nothing here\n')).rejects.toThrow(
        /Invalid configuration in .*runner.yaml:/,
      );
      await expect(load('id: [dt-1\n')).rejects.toThrow(
        /Invalid configuration in .*runner.yaml:[\s\S]*YAMLException/,
      );
    });

    it('Should reject a configuration without an id', async () => {
      await expect(load(base)).rejects.toThrow(/at id/);
    });

    it('Should resolve a relative state machine path', async () => {
      await load(`${base}id: dt-1\nstateMachine: machines/dt.yaml`);

      expect(config.getStateMachine()).toEqual(
        join(dir, 'machines', 'dt.yaml'),
      );
    });

    it('Should keep an absolute state machine path', async () => {
      const file = join(tmpdir(), 'dt.yaml');
      await load(`${base}id: dt-1\nstateMachine: '${file}'`);

      expect(config.getStateMachine()).toEqual(file);
    });
  });
});
