import cleanLog from 'model/backend/gitlab/cleanLog';

describe('cleanLog', () => {
  it('removes ANSI color codes', () => {
    const input = '\u001b[32mSuccess\u001b[0m \u001b[31mError\u001b[0m';
    const result = cleanLog(input);

    expect(result).toBe('Success Error');
  });

  it('removes GitLab section markers', () => {
    const input =
      'section_start:1234:setup\nActual content\nsection_end:1234:setup';
    const result = cleanLog(input);

    expect(result).toBe('Actual content');
  });

  it('handles empty input', () => {
    expect(cleanLog('')).toBe('');
  });

  it('should preserve regular log content', () => {
    const input =
      'Running with gitlab-runner 17.9.0\nCloning repository\nBuilding project';
    expect(cleanLog(input)).toBe(input);
  });

  it('should handle logs with complex ANSI color codes', () => {
    const input =
      '\u001b[38;5;196mError\u001b[0m: \u001b[38;5;33mBuild failed\u001b[0m';
    const expected = 'Error: Build failed';
    expect(cleanLog(input)).toBe(expected);
  });

  it('should handle section markers embedded in text', () => {
    const input = 'Starting jobsection_end:1234:job\nNext line';
    const expected = 'Starting job\nNext line';
    expect(cleanLog(input)).toBe(expected);
  });

  it('handles pure section markers as empty lines', () => {
    const input =
      'section_start:1234:section_name\nsection_end:1234:section_name';
    expect(cleanLog(input)).toBe('');
  });

  it('processes real-world log content correctly', () => {
    const input = `Running with gitlab-runner 15.6.0
section_start:1678901234:prepare_environment
Preparing environment
section_end:1678901234:prepare_environment
section_start:1678901235:get_sources
Getting source from Git repository
\u001b[32mFetching changes...\u001b[0m
section_end:1678901235:get_sources
section_start:1678901236:build
Building project...
\u001b[33mWarning: Deprecated feature used\u001b[0m
\u001b[32mBuild completed successfully\u001b[0m
section_end:1678901236:build`;

    const result = cleanLog(input);

    expect(result).toContain('Running with gitlab-runner 15.6.0');
    expect(result).toContain('Preparing environment');
    expect(result).toContain('Getting source from Git repository');
    expect(result).toContain('Fetching changes');
    expect(result).toContain('Warning: Deprecated feature used');
    expect(result).toContain('Build completed successfully');
    expect(result).not.toContain('\u001b');
    expect(result).not.toContain('section_start');
    expect(result).not.toContain('section_end');
  });

  it('filters out empty lines after cleaning', () => {
    const input = 'Line1\n\nLine2\n   \nLine3';
    const expected = 'Line1\nLine2\nLine3';
    expect(cleanLog(input)).toBe(expected);
  });

  it('properly trims whitespace from each line', () => {
    const input = '   Line with spaces   \n\t\tTabbed line\t\t';
    const expected = 'Line with spaces\nTabbed line';
    expect(cleanLog(input)).toBe(expected);
  });
});
