import {
  getExecutionStatusColor,
  statusColorMap,
} from 'route/measurement/MeasurementComponents';

describe('Measurement status colours', () => {
  describe('statusColorMap', () => {
    it('has colours for all status types', () => {
      expect(statusColorMap.PENDING).toBeDefined();
      expect(statusColorMap.RUNNING).toBeDefined();
      expect(statusColorMap.FAILURE).toBeDefined();
      expect(statusColorMap.SUCCESS).toBeDefined();
      expect(statusColorMap.STOPPED).toBeDefined();
    });

    it.each([
      ['success', '#1976d2'],
      ['failed', '#d32f2f'],
      ['cancelled', '#616161'],
      ['unknown', '#9e9e9e'],
    ])('returns %s status colour', (status, expectedColor) => {
      expect(getExecutionStatusColor(status)).toBe(expectedColor);
    });
  });
});
