import cleanLogContent from 'model/backend/gitlab/cleanLogContent';

// Tests for cleanLogContent function
describe('cleanLogContent', () => {
  it('should remove ANSI escape sequences', () => {
    const input = '\u001b[32mSuccess\u001b[0m';
    const expected = 'Success';
    expect(cleanLogContent(input)).toBe(expected);
  });

  it('should remove GitLab section markers', () => {
    const input = 'section_start:1234:build_step\nBuilding project\nsection_end:1234:build_step';
    const expected = 'Building project';
    expect(cleanLogContent(input)).toBe(expected);
  });

  it('should handle empty or invalid input', () => {
    expect(cleanLogContent('')).toBe('');
    expect(cleanLogContent(null)).toBe('');
    expect(cleanLogContent(undefined)).toBe('');
  });

  it('should preserve regular log content', () => {
    const input = 'Running with gitlab-runner 17.9.0\nCloning repository\nBuilding project';
    expect(cleanLogContent(input)).toBe(input);
  });

  it('should handle logs with complex ANSI color codes', () => {
    const input = '\u001b[38;5;196mError\u001b[0m: \u001b[38;5;33mBuild failed\u001b[0m';
    const expected = 'Error: Build failed';
    expect(cleanLogContent(input)).toBe(expected);
  });
  
  it('should handle section markers embedded in text', () => {
    const input = 'Starting jobsection_end:1234:job\nNext line';
    const expected = 'Starting job\nNext line';
    expect(cleanLogContent(input)).toBe(expected);
  });
  
  it('handles pure section markers as empty lines', () => {
    const input = 'section_start:1234:section_name\nsection_end:1234:section_name';
    expect(cleanLogContent(input)).toBe('');
  });
  
  it('handles multiple ANSI sequences in complex logs', () => {
    const input = '\u001b[32mRunning\u001b[0m \u001b[33mtest\u001b[0m\n\u001b[31mError\u001b[0m';
    const expected = 'Running test\nError';
    expect(cleanLogContent(input)).toBe(expected);
  });
  
  it('filters out empty lines after cleaning', () => {
    const input = 'Line1\n\nLine2\n   \nLine3';
    const expected = 'Line1\nLine2\nLine3';
    expect(cleanLogContent(input)).toBe(expected);
  });
  
  it('properly trims whitespace from each line', () => {
    const input = '   Line with spaces   \n\t\tTabbed line\t\t';
    const expected = 'Line with spaces\nTabbed line';
    expect(cleanLogContent(input)).toBe(expected);
  });

  it('handles realistic GitLab CI logs', () => {
    const realWorldLog = `Running with gitlab-runner 15.6.0
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
    
    const cleaned = cleanLogContent(realWorldLog);
    
    expect(cleaned).not.toContain('\u001b');
    expect(cleaned).not.toContain('section_start');
    expect(cleaned).not.toContain('section_end');
    expect(cleaned).toContain('Preparing environment');
    expect(cleaned).toContain('Getting source from Git repository');
    expect(cleaned).toContain('Fetching changes');
    expect(cleaned).toContain('Warning: Deprecated feature used');
    expect(cleaned).toContain('Build completed successfully');
  });
});