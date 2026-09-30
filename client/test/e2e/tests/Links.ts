import * as dotenv from 'dotenv';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'client/test/.env');
dotenv.config({ path: envPath, quiet: true });

const testUsername = process.env.REACT_APP_TEST_USERNAME ?? '';

type LinkType = {
  text: string;
  url: string;
};

const links: LinkType[] = [
  { text: 'Library', url: './library' },
  { text: 'Digital Twins', url: './digitaltwins' },
  { text: 'Automation', url: './automation' },
  { text: 'Buildings', url: './bim' },
  { text: 'Workbench', url: './workbench' },
  { text: 'Insights', url: './insights' },
];

export const workbenchLinks: LinkType[] = [
  {
    text: 'Desktop',
    url: `./${testUsername}/tools/vnc?path=${testUsername}%2Ftools%2Fvnc%2Fwebsockify`,
  },
  { text: 'VSCode', url: `./${testUsername}/tools/vscode` },
  { text: 'JupyterLab', url: `./${testUsername}/lab` },
  { text: 'Jupyter Notebook', url: `./${testUsername}` },
];

export default links;
