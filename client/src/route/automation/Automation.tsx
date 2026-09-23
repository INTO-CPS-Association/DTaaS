/**
 * The Automation page.
 *
 * The library and digital twins previews are pages of this application, not
 * workbench services. They used to sit among the workbench cards, where the
 * page said each card opens a service in a new tab, which was true of neither.
 * They live here instead, with the measurement page, as cards that follow the
 * route in this tab.
 *
 * The routes are named here as constants. They are internal paths, not
 * deployment endpoints, so there is nothing to configure.
 */

import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import NavigationCards, { NavigationCard } from 'components/NavigationCards';
import {
  LibraryIcon,
  DigitalTwinsIcon,
  MeasurementIcon,
} from 'components/appIcons';

const DESCRIPTION =
  'Build a digital twin in two steps: gather the assets it needs, then create ' +
  'and run it. Then measure how its executions perform. All three drive ' +
  'GitLab CI/CD and are experimental.';

// Each card says what its page does, the way the workbench cards do, so the
// destination is readable without opening it. The first two start with their
// step, because the order matters: a selection made on the first page is what
// the second starts from.
const cards: NavigationCard[] = [
  {
    name: 'Library Page',
    description:
      'Step one. Browse the functions, models, tools and data in the ' +
      'workspace, and choose the ones a digital twin needs.',
    to: '/preview/library',
    icon: <LibraryIcon />,
  },
  {
    name: 'Digital Twins Page',
    description:
      'Step two. Create a digital twin from what was chosen, then run it and ' +
      'follow the pipeline.',
    to: '/preview/digitaltwins',
    icon: <DigitalTwinsIcon />,
  },
  {
    // The trials, runner tags and digital twins under test are fields of the
    // Account page. A person arriving from this card would otherwise run with
    // the defaults without knowing there is anything to set.
    name: 'Measurement',
    description:
      'Run performance measurements of digital twin executions. Trials, ' +
      'runner tags and the digital twins under test are set on the Account ' +
      'page.',
    to: '/insights/measure',
    icon: <MeasurementIcon />,
  },
];

function Automation() {
  return (
    <Layout>
      <PageShell title="Automation" description={DESCRIPTION}>
        <NavigationCards cards={cards} />
      </PageShell>
    </Layout>
  );
}

export default Automation;
