import fs from 'node:fs';
import path from 'node:path';

// Every key of env.js reaches every browser that opens the client, so no
// example may suggest putting a password or a broker login there.
const clientRoot = path.resolve(__dirname, '../../..');
const dockerRoot = path.resolve(clientRoot, '../deploy/dtaas/docker');

function envFiles(): string[] {
  const configs = fs
    .readdirSync(path.join(clientRoot, 'config'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(clientRoot, 'config', name));
  const examples = fs
    .readdirSync(dockerRoot)
    .map((name) => path.join(dockerRoot, name, 'config', 'client.js.example'))
    .filter((file) => fs.existsSync(file));
  return [...configs, ...examples];
}

describe('the env.js files of the client and the deploy packages', () => {
  it('finds the four deploy examples and the client configs', () => {
    const files = envFiles();

    expect(files.filter((f) => f.endsWith('.example'))).toHaveLength(4);
    expect(files.length).toBeGreaterThan(4);
  });

  it.each(envFiles().map((file) => [path.relative(dockerRoot, file), file]))(
    '%s holds no password and no broker login',
    (_name, file) => {
      const text = fs.readFileSync(file, 'utf-8');

      expect(text).not.toMatch(/PASSWORD/i);
      expect(text).not.toMatch(/VIZ_MQTT/);
    },
  );
});
