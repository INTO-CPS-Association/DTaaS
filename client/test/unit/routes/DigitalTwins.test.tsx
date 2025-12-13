import DigitalTwins from 'route/digitaltwins/DigitalTwins';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import {
  InitRouteTests,
  itDisplaysContentOfTabs,
  itHasCorrectTabNameinDTIframe,
} from 'test/unit/unit.testUtil';

jest.mock('components/tab/TabComponent', () => ({
  ...jest.requireActual('components/tab/TabComponent'),
}));

describe('Digital Twins', () => {
  const tabLabels: string[] = [];
  tabs.forEach((tab) => tabLabels.push(tab.label));
  InitRouteTests(<DigitalTwins />);

  itDisplaysContentOfTabs(tabs);

  itHasCorrectTabNameinDTIframe(tabLabels);
});
