import React, { Component } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { GitlabInstance, FolderEntry } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import tabs from './DigitalTwinTabData';
import ExecuteTab from './ExecuteTab';

class DTContent extends Component<Record<string, never>, { subfolders: FolderEntry[], gitlabInstance: GitlabInstance | null }> {
  constructor(props: Record<string, never>
  ) {
    super(props);
    this.state = {
      subfolders: [],
      gitlabInstance: null,
    };
  }

  async fetchSubfolders() {
    const instance = new GitlabInstance(sessionStorage.getItem('username') || '', getAuthority(), sessionStorage.getItem('access_token') || '');
    this.setState({ gitlabInstance: instance });
    const projectId = await instance.getProjectId();
    if (projectId) {
      const subfoldersData = await instance.getDTSubfolders(projectId);
      this.setState({ subfolders: subfoldersData });
    }
  }

  componentDidMount() {
    this.fetchSubfolders();
  }

  render() {
    const { subfolders, gitlabInstance } = this.state;
    const DTTab: TabData[] = tabs
      .filter((tab) => tab.label === 'Execute')
      .map((tab) => ({
        label: tab.label,
        body: (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            {gitlabInstance && <ExecuteTab subfolders={subfolders} gitlabInstance={gitlabInstance} />}
          </>
        ),
      }));

    return (
      <Layout>
        <TabComponent assetType={DTTab} scope={[]} />
      </Layout>
    );
  }
}

export default DTContent;