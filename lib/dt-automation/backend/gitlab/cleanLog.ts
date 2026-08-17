// eslint-disable-next-line no-control-regex
const ANSI_COLOR_ESCAPE = /\u001b\[[\d;]*[mK]/g;
const ANSI_ESCAPE_SEQUENCES =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-ORZcf-nqry=><]/g;
const COMPLETE_SECTION_LINE = /^section_(start|end):\d+:[a-zA-Z\d_-]+$/;
const SECTION_START = /section_start:\d+:[a-zA-Z\d_-]+/g;
const SECTION_END = /section_end:\d+:[a-zA-Z\d_-]+/g;

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
