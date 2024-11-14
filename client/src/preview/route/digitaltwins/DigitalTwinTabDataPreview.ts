import { ITabs } from 'route/IData';

const tabs: ITabs[] = [
  {
    label: 'Create',
    body: `Create and save new digital twins. The new digital twins are saved in the linked gitlab repository. Remember to add valid '.gitlab-ci.yml' configuration as it is used for execution of digital twin.`,
  },
  {
    label: 'Manage',
    body: `Explore, edit and delete existing digital twins. The changes get saved in the linked gitlab repository.`,
  },
  {
    label: 'Execute',
    body: 'Execute existing digital twins using CI/CD pipelines of the linked gitlab repository. Availability of gitlab runners is required for execution of digital twins.',
  },
  {
    label: 'Analyze',
    body: 'The analysis of digital twins requires running of digital twin script from user workspace. The execution results placed within data directory are processed by analysis scripts and results are placed back in the data directory. These scripts can either be executed from VSCode and graphical results or can be executed from VNC GUI.',
  },
];

export default tabs;
