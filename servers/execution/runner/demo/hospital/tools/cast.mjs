// An asciicast v2 recording on a clock that it may share with another
// cast (clock.mjs): each event takes the clock's time, or a given one
import { writeFileSync } from 'node:fs';

const PROMPT = '\x1b[32mmanager\x1b[0m:\x1b[34m~/hospital\x1b[0m$ ';

export default class Cast {
  events = [];

  constructor(clock, width, height, title) {
    this.clock = clock;
    this.header = { version: 2, width, height, title };
  }

  event(type, data, time = this.clock.now) {
    this.events.push([time, type, data]);
  }

  output(text, time) {
    this.event('o', text.replace(/\r?\n/g, '\r\n'), time);
  }

  marker(label) {
    this.event('m', label);
  }

  // A command typed at the prompt, one character at a time
  type(command) {
    this.output(PROMPT);
    this.clock.pause(0.4);
    [...command].forEach((character, index) => {
      this.output(character);
      this.clock.pause(0.025 + (index % 4) * 0.008);
    });
    this.clock.pause(0.3);
    this.output('\n');
  }

  // A narration line, a word at a time
  say(text) {
    this.output('\x1b[33m#');
    text.split(' ').forEach((word) => {
      this.output(` ${word}`);
      this.clock.pause(0.05);
    });
    this.output('\x1b[0m\n');
    this.clock.pause(0.5);
  }

  save(file, timestamp) {
    this.events.sort(([a], [b]) => a - b);
    const header = { ...this.header, timestamp };
    const lines = [header, ...this.events].map((line) => JSON.stringify(line));
    writeFileSync(file, `${lines.join('\n')}\n`);
  }
}
