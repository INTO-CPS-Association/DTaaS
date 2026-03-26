import { Paper, Typography } from '@mui/material';
import LinkButtons from 'components/LinkButtons';
import Layout from 'page/Layout';

import styled from '@emotion/styled';
import { useWorkbenchLinkValues, useAppURL } from 'util/envUtil';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'store/store';
import { fetchWorkbenchServices } from 'store/workbench.slice';
import { useEffect } from 'react';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

function WorkBenchContent() {
  const linkValues = useWorkbenchLinkValues();
  const dispatch = useDispatch<AppDispatch>();
  const username = useSelector((state: RootState) => state.auth).userName ?? '';
  const servicesStatus = useSelector(
    (state: RootState) => state.workbench.status,
  );
  const appURL = useAppURL();

  useEffect(() => {
    if (servicesStatus === 'idle' && username) {
      dispatch(
        fetchWorkbenchServices({
          url: `${appURL}/${username}/services`,
          username,
        }),
      );
    }
  }, [servicesStatus, username, appURL, dispatch]);

  return (
    <Layout sx={{ display: 'flex' }}>
      <Paper
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Typography variant="h4">Workbench Tools</Typography>
        <Container>
          <LinkButtons buttons={linkValues} size={6} marginRight={40} />
        </Container>
      </Paper>
    </Layout>
  );
}

export default function WorkBench() {
  return <WorkBenchContent />;
}
