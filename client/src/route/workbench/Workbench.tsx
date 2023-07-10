import { Paper, Typography } from '@mui/material';
import LinkButtons from 'components/linkButtons/LinkButtons';
import Layout from 'page/Layout';
import * as React from 'react';
import styled from '@emotion/styled';
import { useWorkbenchLinkValues } from 'util/envUtil';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

function WorkBenchContent() {
  const linkValues = useWorkbenchLinkValues();
  return (
    <Layout>
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
          <LinkButtons buttons={linkValues} size={6} />
        </Container>
      </Paper>
    </Layout>
  );
}

export default function WorkBench() {
  return <WorkBenchContent />;
}
