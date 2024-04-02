import * as React from 'react';
import Account from 'route/auth/Account';
import tabs from 'route/auth/AccountTabData';
import { InitRouteTests, itDisplaysContentOfTabs } from '../testUtils';

describe('Account Page', () => {
  const tabLabels: string[] = [];
  tabs.forEach((tab) => tabLabels.push(tab.label));
  InitRouteTests(<Account />);

  itDisplaysContentOfTabs(tabs);
});
