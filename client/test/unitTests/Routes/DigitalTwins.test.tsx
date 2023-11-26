import * as React from 'react';
import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import {
  InitRouteTests,
  itDisplaysContentOfTabs,
  itHasCorrectTabNameinDTIframe,
} from '../testUtils';

describe('Digital Twins', () => {
  InitRouteTests(<DigitalTwins />);

  itDisplaysContentOfTabs(tabs);

  itHasCorrectTabNameinDTIframe([tabs[0].label]);
});
