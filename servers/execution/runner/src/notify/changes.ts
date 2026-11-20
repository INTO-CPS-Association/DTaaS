export type ChangeListener = () => void;

// Tells its listeners of a signal, such as a possible change of the
// state document or a connection to the MQTT broker
export default class Changes {
  private readonly listeners: ChangeListener[] = [];

  on(listener: ChangeListener): void {
    this.listeners.push(listener);
  }

  emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
