const cleanLog = (log: string): string => {
  if (!log) return '';  
  
  let logCache = log.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*[mK]/g, 
    ''
  );
  
  logCache = logCache.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
  
  const lines = logCache.split('\n');
  const cleanedLines = lines.map(line => {
    if (line.match(/^section_(start|end):[0-9]+:[a-zA-Z0-9_-]+$/)) {
      return '';
    }
    return line
      .replace(/section_start:[0-9]+:[a-zA-Z0-9_-]+/g, '')
      .replace(/section_end:[0-9]+:[a-zA-Z0-9_-]+/g, '')
      .trim();
  });
  return cleanedLines
    .filter(line => line.length > 0)
    .join('\n');
};

export default cleanLog;