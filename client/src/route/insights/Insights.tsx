/**
 * The Insights page: what the platform can tell a person about itself.
 *
 * It is a landing page and not a shortcut to one view, because more entries are
 * expected here. The measurement page stays under Automation, where it is
 * started from, although its path is `insights/measure`.
 */

import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import NavigationCards, { NavigationCard } from 'components/NavigationCards';
import { LogsIcon, ConfigIcon } from 'components/appIcons';

const cards: NavigationCard[] = [
  {
    name: 'Logs',
    description:
      'How this website was used, recorded in this browser once logging is ' +
      'enabled in Settings, to view and download.',
    to: '/insights/log',
    icon: <LogsIcon />,
  },
  {
    name: 'Config',
    description:
      'Whether the configuration of this installation is valid, checked from ' +
      'this browser.',
    to: '/insights/config',
    icon: <ConfigIcon />,
  },
];

function Insights() {
  return (
    <Layout>
      <PageShell
        title="Insights"
        description="What the platform can tell you about itself."
      >
        <NavigationCards cards={cards} />
      </PageShell>
    </Layout>
  );
}

export default Insights;
