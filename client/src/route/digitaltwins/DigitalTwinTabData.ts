import { ITabs } from 'route/IData';

const tabs: ITabs[] = [
  {
    label: 'Create',
    body: `Create digital twins from tools provided within user workspaces. Each digital twin will have one directory. It is suggested that user provide one bash shell script to run their digital twin. Users can create the required scripts and other files from tools provided in Workbench page.`,
  },
  {
    label: 'Manage',
    body: `Read the complete description of digital twins. If necessary, users can delete a digital twin, removing it from the workspace with all its associated data. Users can also reconfigure the digital twin, through a link that redirects to the Create tab.`,
  },
  {
    label: 'Execute',
    body: 'Digital twins are executed from within user workspaces. The given bash script gets executed from digital twin directory. Terminal-based digital twins can be executed from VSCode and graphical digital twins can be executed from VNC GUI. The results of execution can be placed in the data directory.',
  },
  {
    label: 'Analyze',
    body: 'The analysis of digital twins requires running of digital twin script from user workspace. The execution results placed within data directory are processed by analysis scripts and results are placed back in the data directory. These scripts can either be executed from VSCode and graphical results or can be executed from VNC GUI.',
  },
];

export default tabs;
