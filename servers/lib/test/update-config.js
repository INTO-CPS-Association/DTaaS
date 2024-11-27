import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// Load environment variables
const env = process.env;

const yamlFilePath = path.join(__dirname, process.env.LIBMS_CONFIG_PATH || 'libms.test.yaml');
const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
const config = yaml.load(fileContents);

if (env.LIBMS_LOCAL_PATH) {
  console.log('Updating local-path to '+ env.LIBMS_LOCAL_PATH);
  config['local-path'] = env.LIBMS_LOCAL_PATH;
}

if (env.LIBMS_PORT) {
  console.log('Updating PORT to '+ env.LIBMS_PORT);
  config['port'] = env.LIBMS_PORT;
}

const updatedYaml = yaml.dump(config);
fs.writeFileSync(yamlFilePath, updatedYaml, 'utf8');

console.log( yamlFilePath + ' updated successfully.');