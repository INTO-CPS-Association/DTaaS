import * as React from 'react';
import Library from 'route/library/Library';
import { assetType } from 'route/library/LibraryTabData';
import { mockURLforLIB } from '../__mocks__/global_mocks';
import {
  InitRouteTests,
  itDisplaysContentOfTabs,
  itHasCorrectURLOfTabsWithIframe,
  TabLabelURLPair,
} from '../testUtils';
import AuthProvider from '../../../src/route/auth/AuthProvider';

const urlsByTabs: TabLabelURLPair[] = assetType.map((tab) => ({
  label: tab.label,
  url: mockURLforLIB,
}));

describe('Library with no props', () => {
  InitRouteTests(
    <AuthProvider>
      <Library />
    </AuthProvider>
  );

  itDisplaysContentOfTabs(assetType);

  itHasCorrectURLOfTabsWithIframe(urlsByTabs);
});
