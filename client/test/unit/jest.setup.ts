import '@testing-library/jest-dom';
import 'test/__mocks__/global_mocks';
import 'test/__mocks__/unit/page_mocks';
import 'test/__mocks__/unit/component_mocks';
import 'test/__mocks__/unit/module_mocks';

beforeEach(() => {
  jest.resetAllMocks();
});
