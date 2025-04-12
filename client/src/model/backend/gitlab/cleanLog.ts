// eslint-disable-next-line no-control-regex
const ANSI_COLOR_ESCAPE = /\u001b\[[0-9;]*[mK]/g;
const ANSI_ESCAPE_SEQUENCES =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const COMPLETE_SECTION_LINE = /^section_(start|end):[0-9]+:[a-zA-Z0-9_-]+$/;
const SECTION_START = /section_start:[0-9]+:[a-zA-Z0-9_-]+/g;
const SECTION_END = /section_end:[0-9]+:[a-zA-Z0-9_-]+/g;

const cleanLog = (log: string): string => {
  if (!log) return '';

  let logCache = log.replace(ANSI_COLOR_ESCAPE, '');

  logCache = logCache.replace(ANSI_ESCAPE_SEQUENCES, '');

  const lines = logCache.split('\n');
  const cleanedLines = lines.map((line) => {
    if (line.match(COMPLETE_SECTION_LINE)) {
      return '';
    }
    return line.replace(SECTION_START, '').replace(SECTION_END, '').trim();
  });
  return cleanedLines.filter((line) => line.length > 0).join('\n');
};

export default cleanLog;
