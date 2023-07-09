import * as React from 'react';
import Library from 'route/library/Library';
import tabs from 'route/library/LibraryTabData';
import AuthProvider from '../../../src/route/auth/AuthProvider';
import { InitRouteTests, itDisplaysContentOfTabs } from '../testUtils';

// Only needed while Authentication is using Redux directly. Once Authentication
// is using an Access module (e.g. UserAccess), this can be removed and replced with a mock of
// the Access module.
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

describe('Library with no props', () => {
  InitRouteTests(
    <AuthProvider>
      <Library />
    </AuthProvider>
  );

  itDisplaysContentOfTabs(tabs);
});
