import {
  getURLforDT,
  getURLforWorkbench,
  getURLforLIB,
  getWorkbenchLinkValues,
} from 'util/envUtil';
import { useSelector } from 'react-redux';

jest.unmock('util/envUtil');

describe('envUtil', () => {
  const testDT = 'https://digitaltwins.example.com';
  const testLIB = 'https://library.example.com';
  const testWorkbench = 'https://workbench.example.com';
  const testWorkbenchEndpoints = [
    'one',
    '/two',
    'three/',
    '/four/',
    '/five/guy/',
  ];
  const testUsername = 'username';

  window.env = {
    REACT_APP_ENVIRONMENT: 'test',
    REACT_APP_URL_DT: testDT,
    REACT_APP_URL_LIB: testLIB,
    REACT_APP_URL_WORKBENCH: testWorkbench,
    REACT_APP_WORKBENCHLINK_ONE: testWorkbenchEndpoints[0],
    REACT_APP_WORKBENCHLINK_TWO: testWorkbenchEndpoints[1],
    REACT_APP_WORKBENCHLINK_THREE: testWorkbenchEndpoints[2],
    REACT_APP_WORKBENCHLINK_FOUR: testWorkbenchEndpoints[3],
    REACT_APP_WORKBENCHLINK_FIVE: testWorkbenchEndpoints[4],
  };

  beforeEach(() => {
    (useSelector as jest.Mock).mockReturnValue({ userName: testUsername });
  });

  test('GetURL should return the correct enviroment variables', () => {
    expect(getURLforDT()).toBe(`${testDT}/${testUsername}/lab`);
    expect(getURLforLIB()).toBe(`${testLIB}/${testUsername}/`);
    expect(getURLforWorkbench()).toBe(testWorkbench);
  });

  test('GetWorkbenchLinkValues should return an array', () => {
    const result = getWorkbenchLinkValues();
    expect(Array.isArray(result)).toBe(true);
  });

  // Test that array elements have the expected shape
  test('GetWorkbenchLinkValues should return an array of objects with "key" and "link" properties', () => {
    const result = getWorkbenchLinkValues();
    expect(
      result.every(
        (el) => typeof el.key === 'string' && typeof el.link === 'string'
      )
    ).toBe(true);
  });

  // Test that the links are correctly constructed
  it('should construct the links correctly', () => {
    const result = getWorkbenchLinkValues();

    const noTrailingOrLeadingSlashes = (str: string) =>
      str.replace(/^\/|\/$/g, '');

    result.forEach((el, i) => {
      expect(el.link).toEqual(
        `${testWorkbench}/${testUsername}/${noTrailingOrLeadingSlashes(
          testWorkbenchEndpoints[i]
        )}`
      );
    });
  });
});
