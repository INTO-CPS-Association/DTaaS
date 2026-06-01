import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import {
  InitRouteTests,
  itDisplaysContentOfTabs,
  itHasCorrectTabNameinDTIframe,
} from 'test/unit/unit.testUtil';

// Hoisted by ts-jest above the imports, so DigitalTwins loads the real TabComponent.
jest.unmock('components/tab/TabComponent');

describe('Digital Twins', () => {
  const tabLabels: string[] = [];
  tabs.forEach((tab) => tabLabels.push(tab.label));
  InitRouteTests(<DigitalTwins />);

  itDisplaysContentOfTabs(tabs);

  itHasCorrectTabNameinDTIframe(tabLabels);
});
