import { useHost } from '@into-cps-association/dtaas-sdk';
import Reading from 'examples/hello-kit/src/react/Reading';
import configSchema from 'examples/hello-kit/src/dtaas/config';

const ROOM1 = 'hello/room1/temperature';

/** Reads everything through the host: user, config, and signals at the playhead. */
function HelloPage() {
  const host = useHost();
  const { Page } = host.ui;
  const user = host.auth.useUser();
  const t = host.signals.playhead.use();
  const { greeting } = host.config(configSchema);
  const reading = host.signals.valueAt(ROOM1, 'measured', t);
  return (
    <Page title="Hello" description="A minimal DTaaS extension">
      <p>
        {greeting}, {user?.username ?? 'guest'}
      </p>
      <Reading label="Room 1" value={reading?.value} unit="°C" />
    </Page>
  );
}

export default HelloPage;
