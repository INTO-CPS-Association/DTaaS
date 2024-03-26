import * as React from 'react';
import Layout from 'page/Layout';
import AccountTabs from './AccountTabs';

const AccountContent: React.FC = () => (
  <Layout>
    <AccountTabs />
  </Layout>
);

const Account: React.FC = () => <AccountContent />; /* jshint ignore:line */
export default Account;