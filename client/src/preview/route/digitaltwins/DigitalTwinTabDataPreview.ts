import { ITabs } from 'route/IData';

const tabs: ITabs[] = [
  {
    label: 'Create',
    body: `Create digital twins from tools provided within user workspaces. Each digital twin will have one directory. It is suggested that user provide one bash shell script to run their digital twin. Users can create the required scripts and other files from tools provided in Workbench page.`,
  },
  {
    label: 'Execute',
    body: 'This page demonstrates integration of DTaaS with gitlab CI/CD workflows. The feature is experimental and requires certain gitlab setup in order for it to work.',
  },
  {
    label: 'Analyze',
    body: 'The analysis of digital twins requires running of digital twin script from user workspace. The execution results placed within data directory are processed by analysis scripts and results are placed back in the data directory. These scripts can either be executed from VSCode and graphical results or can be executed from VNC GUI.',
  },
];

export default tabs;
