import { formatName } from 'src/digitalTwin';

describe('formatName', () => {
  it('reads a directory name as a title', () => {
    expect(formatName('mass-spring-damper')).toBe('Mass Spring Damper');
  });

  it('keeps minor words lowercase inside the title', () => {
    expect(formatName('house-of-the-rising-sun')).toBe(
      'House of the Rising Sun',
    );
  });

  it('capitalises a minor word when it comes first', () => {
    expect(formatName('the-incubator')).toBe('The Incubator');
  });

  it('leaves an acronym the name already carries in its own case', () => {
    expect(formatName('DTaaS-and-IFC')).toBe('DTaaS and IFC');
  });
});
