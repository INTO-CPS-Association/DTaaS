// unused type
export type PermitCommand = {
  name: string;
  executable: string;
};

export type ConfigValues = {
  port: number;
  // os-compatible relative filepath of the config yaml file.
  // The relative filepath is with reference to the execution
  // directory of the runner
  location: string;
  commands: Array<string>;
};

export const configDefault: ConfigValues = {
  port: 5000,
  location: 'script',
  commands: [],
};
