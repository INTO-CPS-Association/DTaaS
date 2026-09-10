import { Grid, Typography } from '@mui/material';
import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import ToolCard from 'components/workbench/ToolCard';
import LinkIcons from 'components/LinkIconsLib';
import toolDescriptions from 'route/workbench/toolDescriptions';

import { useWorkbenchLinkValues, useAppURL } from 'util/envUtil';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'store/store';
import { fetchWorkbenchServices } from 'store/workbench.slice';
import { useEffect } from 'react';

/**
 * The workbench page.
 *
 * The tools used to be a row of icons six rem tall, centred in an otherwise
 * empty panel: the icons carried all the meaning and none of them said what
 * the tool was for. They are now a responsive grid of cards, each with its
 * name, one line of description and the address it opens, so the page reads
 * as a menu of places to go.
 *
 * The links themselves are unchanged. They still come from
 * `useWorkbenchLinkValues`, and each still opens in a new tab.
 */
function WorkBenchContent() {
  const linkValues = useWorkbenchLinkValues();
  const dispatch = useDispatch<AppDispatch>();
  const username = (
    useSelector((state: RootState) => state.auth).userName ?? ''
  )
    .trim()
    .toLowerCase();
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
    <Layout>
      <PageShell
        title="Workbench Tools"
        description="Environments running in your workspace. Each one opens in a new tab."
      >
        {linkValues.length === 0 ? (
          // An empty workspace is a state a person will meet, so it says what
          // is happening instead of showing an empty panel.
          <Typography variant="body2" color="text.secondary">
            No tools are available yet. They appear here once your workspace
            reports the services it is running.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {linkValues.map((tool) => {
              const iconData =
                LinkIcons[tool.key.toUpperCase()] ?? LinkIcons.NO_ICON;
              return (
                <Grid key={tool.link} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ToolCard
                    name={iconData.name ?? tool.key}
                    link={tool.link}
                    description={toolDescriptions[tool.key.toUpperCase()]}
                    icon={iconData.icon}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </PageShell>
    </Layout>
  );
}

export default function WorkBench() {
  return <WorkBenchContent />;
}
