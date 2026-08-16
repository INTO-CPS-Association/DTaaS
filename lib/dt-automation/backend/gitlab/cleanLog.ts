// eslint-disable-next-line no-control-regex
const ANSI_COLOR_ESCAPE = /\u001b\[[0-9;]*[mK]/g;
const ANSI_ESCAPE_SEQUENCES =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const COMPLETE_SECTION_LINE = /^section_(start|end):[0-9]+:[a-zA-Z0-9_-]+$/;
const SECTION_START = /section_start:[0-9]+:[a-zA-Z0-9_-]+/g;
const SECTION_END = /section_end:[0-9]+:[a-zA-Z0-9_-]+/g;

function removeAnsiSequences(log: string): string {
  return log.replace(ANSI_COLOR_ESCAPE, '').replace(ANSI_ESCAPE_SEQUENCES, '');
}

function cleanLogLine(line: string): string {
  return COMPLETE_SECTION_LINE.test(line)
    ? ''
    : line.replace(SECTION_START, '').replace(SECTION_END, '').trim();
}

const cleanLog = (log: string): string =>
  removeAnsiSequences(log)
    .split('\n')
    .map(cleanLogLine)
    .filter((line) => line.length > 0)
    .join('\n');

export default cleanLog;
