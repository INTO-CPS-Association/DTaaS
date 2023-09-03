import * as React from 'react';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

type LinkIconsType = {
  [key: string]: { icon: React.ReactElement; name: string | undefined };
};

const LinkIcons: LinkIconsType = {
  TERMINAL: {
    icon: <TerminalOutlinedIcon />,
    name: 'Terminal',
  },
  VNCDESKTOP: {
    icon: <DesktopWindowsOutlinedIcon />,
    name: 'Desktop',
  },
  VSCODE: {
    icon: <CodeOutlinedIcon />,
    name: 'VSCode',
  },
  JUPYTERLAB: {
    icon: <ScienceOutlinedIcon />,
    name: 'JupyterLab',
  },
  JUPYTERNOTEBOOK: {
    icon: <NoteAltOutlinedIcon />,
    name: 'Jupyter Notebook',
  },
  NO_ICON: {
    icon: <OpenInNewIcon />,
    name: undefined,
  },
};

export default LinkIcons;
export { LinkIcons };
