import * as React from 'react';
import Layout from 'page/Layout';
import AccountTabs from './AccountTabs';

const DTContent: React.FC = () => (
  <Layout>
    <AccountTabs />
  </Layout>
);

const DigitalTwins: React.FC = () => <DTContent />; /* jshint ignore:line */
export default DigitalTwins;
