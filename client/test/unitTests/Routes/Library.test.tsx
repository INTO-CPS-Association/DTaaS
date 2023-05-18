import * as React from 'react';
import Library from 'route/library/Library';
import tabs from 'route/library/LibraryTabData';
import AuthProvider from '../../../src/route/auth/AuthProvider';
import { InitRouteTests, itDisplaysContentOfTabs } from '../testUtils';

describe('Library with no props', () => {
  InitRouteTests(
    <AuthProvider>
      <Library />
    </AuthProvider>
  );

  itDisplaysContentOfTabs(tabs);
});
