/**
 * The configuration check, inside the application.
 *
 * The same component serves the public `config/user` and `config/developer`
 * pages, which work before sign-in. Here it is embedded, so the user view
 * drops the link back to sign-in, and its link to the developer view stays
 * inside the application with the menu.
 */

import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import Config from 'route/config/Config';

const PAGES = {
  user: {
    title: 'Config',
    description: 'Whether the configuration of this installation is valid.',
  },
  developer: {
    title: 'Developer Config',
    description:
      'Every configuration value of this installation and the result of its check.',
  },
};

function InsightsConfig({
  role = 'user',
}: Readonly<{ role?: 'user' | 'developer' }>) {
  return (
    <Layout>
      <PageShell
        title={PAGES[role].title}
        description={PAGES[role].description}
      >
        <Config role={role} variant="embedded" />
      </PageShell>
    </Layout>
  );
}

export default InsightsConfig;
