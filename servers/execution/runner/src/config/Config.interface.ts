export type Command = {
  name: string;
  executable: string;
};

export default interface Config {
  port: number;
  location: string;
  commands: Array<Command>;
}
