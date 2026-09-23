/**
 * The user configuration check, inside the application.
 *
 * The same component serves the public `config/user` page, which works before
 * sign-in. Here it is embedded, so it drops the link back to sign-in and reaches
 * the developer view through the router.
 */

import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import Config from 'route/config/Config';

function InsightsConfig() {
  return (
    <Layout>
      <PageShell
        title="Config"
        description="Whether the configuration of this installation is valid."
      >
        <Config role="user" variant="embedded" />
      </PageShell>
    </Layout>
  );
}

export default InsightsConfig;
