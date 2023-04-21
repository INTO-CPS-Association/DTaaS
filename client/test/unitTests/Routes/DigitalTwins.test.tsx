import * as React from 'react';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import { mockURLforDT } from '../__mocks__/global_mocks';
import {
  InitRouteTests,
  itDisplaysContentOfTabs,
  itHasCorrectURLOfTabsWithIframe,
} from '../testUtils';

describe('Digital Twins', () => {
  InitRouteTests(<DigitalTwins />);

  itDisplaysContentOfTabs(tabs);

  itHasCorrectURLOfTabsWithIframe([
    { label: tabs[0].label, url: mockURLforDT },
  ]);
});
