import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useDispatch } from 'react-redux';
import { setUserName } from 'store/auth.slice';
import tabs from './LibraryTabData';

function LibraryContent() {
  const LIBurl = useURLforLIB();
  const auth = useAuth();
  const dispatch = useDispatch();
  const [localUsername, setLocalUsername] = React.useState<string>('');

  React.useEffect(() => {
    if (auth.user !== null && auth.user !== undefined) {
      const profileUrl = auth.user.profile.profile ?? '';
      const username = profileUrl.split('/').filter(Boolean).pop();
      setLocalUsername(username ?? '');
      dispatch(setUserName(localUsername));
    }
  });

  const tabsData: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        <Iframe title={`JupyterLight-Demo-${tab.label}`} url={LIBurl} />
      </>
    ),
  }));
  return (
    <Layout>
      <TabComponent tabs={tabsData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
