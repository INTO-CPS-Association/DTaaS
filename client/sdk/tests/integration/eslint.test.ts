/**
 * @jest-environment node
 */
import { Linter } from 'eslint';
import dtaasKitConfig from 'src/eslint';

const lint = (code: string) =>
  new Linter({ configType: 'flat' })
    .verify(code, [
      { languageOptions: { ecmaVersion: 2022, sourceType: 'module' } },
      ...dtaasKitConfig,
    ])
    .map((m) => m.ruleId);

describe('the kit ESLint config', () => {
  it.each([
    "import mqtt from 'mqtt';",
    "import { Client } from '@stomp/stompjs';",
    "import { InfluxDB } from '@influxdata/influxdb-client';",
    "import { io } from 'socket.io-client';",
    "import WebSocketServer from 'ws';",
    "import store from '@into-cps-association/dtaas-web/store';",
    "import app from '@into-cps-association/dtaas-web';",
    "import { buffers } from '@into-cps-association/dtaas-visualisation/store';",
    "import viz from '@into-cps-association/dtaas-visualisation';",
  ])('forbids %s', (code) => {
    expect(lint(code)).toEqual(['no-restricted-imports']);
  });

  it.each([
    "import { definePreset } from '@into-cps-association/dtaas-visualisation/contribute';",
    "import { definePreset } from '@into-cps-association/dtaas-visualisation/contribute/presets';",
    "import { useHost } from '@into-cps-association/dtaas-sdk';",
    "import { Mesh } from 'three';",
  ])('allows %s', (code) => {
    expect(lint(code)).toEqual([]);
  });

  it('forbids opening sockets through globals', () => {
    expect(lint("const s = new WebSocket('wss://x');")).toEqual([
      'no-restricted-globals',
    ]);
    expect(lint("const s = new EventSource('https://x');")).toEqual([
      'no-restricted-globals',
    ]);
    expect(lint("const s = new globalThis.WebSocket('wss://x');")).toEqual([
      'no-restricted-properties',
    ]);
  });

  it.each([
    "const mqtt = await import('mqtt');",
    "const stomp = await import('@stomp/stompjs');",
    "const ws = await import('ws');",
    "const store = await import('@into-cps-association/dtaas-web/store');",
    "const store = await import('@into-cps-association/dtaas-visualisation/store');",
    "const viz = await import('@into-cps-association/dtaas-visualisation');",
  ])('forbids the dynamic import %s', (code) => {
    expect(lint(code)).toEqual(['no-restricted-syntax']);
  });

  it.each([
    "const c = await import('@into-cps-association/dtaas-visualisation/contribute/presets');",
    "const page = await import('./pages/WindPage');",
    "const mqttish = await import('mqtt-pattern');",
  ])('allows the dynamic import %s', (code) => {
    expect(lint(code)).toEqual([]);
  });

  it('forbids sockets and env through self', () => {
    expect(lint("const s = new self.WebSocket('wss://x');")).toEqual([
      'no-restricted-properties',
    ]);
    expect(lint('const url = self.env.REACT_APP_URL;')).toEqual([
      'no-restricted-properties',
    ]);
  });

  it('forbids reading env.js directly', () => {
    expect(lint('const url = globalThis.env.REACT_APP_URL;')).toEqual([
      'no-restricted-properties',
    ]);
    expect(lint('const url = window.env.REACT_APP_URL;')).toEqual([
      'no-restricted-properties',
    ]);
  });

  it('explains the alternative in the message', () => {
    const [message] = new Linter({ configType: 'flat' }).verify(
      "import mqtt from 'mqtt';",
      [{ languageOptions: { sourceType: 'module' } }, ...dtaasKitConfig],
    );
    expect(message.message).toContain('HostServices.signals');
  });
});
