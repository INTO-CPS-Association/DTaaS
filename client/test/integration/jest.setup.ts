import '@testing-library/jest-dom';
import 'test/__mocks__/integration/module_mocks';
import 'test/__mocks__/global_mocks';

beforeEach(() => {
  jest.resetAllMocks();
});

global.window.env = {
  ...global.window.env,
  REACT_APP_AUTH_AUTHORITY:
    process.env.REACT_APP_AUTH_AUTHORITY || 'https://example.com',
};
