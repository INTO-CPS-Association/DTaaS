export const mockURLforDT = 'https://example.com/URL_DT';
export const mockURLforLIB = 'https://example.com/URL_LIB';
export const mockURLforWorkbench = 'https://example.com/URL_WORKBENCH';

jest.mock('util/envUtil', () => ({
  getURLforDT: () => mockURLforDT,
  getURLforLIB: () => mockURLforLIB,
  getURLforWorkbench: () => mockURLforWorkbench,
}));
