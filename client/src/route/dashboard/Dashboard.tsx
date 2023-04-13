/* eslint-disable no-console */
/*
source: https://github.com/mui/material-ui/tree/v5.10.0/docs/data/material/getting-started/templates/dashboard
*/
import * as React from 'react';
import Paper from '@mui/material/Paper';
import Layout from 'page/Layout';
import Chart from 'components/Chart';
import RecentRuns from 'components/RecentRuns';
import {
  getCodeParam,
  getGitLabAccessToken,
} from '../../util/authentication';

const CLIENT_ID = window.env.REACT_APP_CLIENT_ID;
const CLIENT_SECRET = window.env.REACT_APP_CLIENT_SECRET;
const REDIRECT_URL = window.env.REACT_APP_REDIRECT_URL;
const GITLAB_OAUTH_TOKEN = window.env.REACT_APP_GITLAB_OAUTH_TOKEN;

function DashboardContent() {
  const [hasAccessToken, setHasAccessToken] = React.useState(false);

  React.useEffect(() => {
    const codeParam = getCodeParam();
    if (localStorage.getItem('accessToken') === null) {
      if (codeParam) {
        // No accessToken so we request one
        getGitLabAccessToken(
          CLIENT_ID,
          CLIENT_SECRET,
          REDIRECT_URL,
          codeParam,
          GITLAB_OAUTH_TOKEN
        ).then(() => {
          setHasAccessToken(true);
        });
      }
    } else {
      setHasAccessToken(true);
    }
  }, []);

  if (!hasAccessToken) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      {/* Chart */}
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: 240,
        }}
      >
        <Chart />
      </Paper>
      {/* Past Runs */}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <RecentRuns />
      </Paper>
    </Layout>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}