import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(process.cwd(), 'client/test/.env');
dotenv.config({ path: envPath });

const testUsername = process.env.REACT_APP_TEST_USERNAME ?? '';

type LinkType = {
  text: string;
  url: string;
};

const links: LinkType[] = [
  { text: 'Library', url: './library' },
  { text: 'Digital Twins', url: './digitaltwins' },
  { text: 'Workbench', url: './workbench' },
];

export const workbenchLinks: LinkType[] = [
  {
    text: 'Desktop-btn',
    url: `./${testUsername}/tools/vnc/?password=vncpassword`,
  },
  { text: 'VSCode-btn', url: `./${testUsername}/tools/vscode` },
  { text: 'JupyterLab-btn', url: `./${testUsername}/lab` },
  { text: 'Jupyter Notebook-btn', url: `./${testUsername}` },
  { text: 'Library page preview-btn', url: `./preview/library` },
  { text: 'Digital Twins page preview-btn', url: `./preview/digitaltwins` },
];

export default links;
