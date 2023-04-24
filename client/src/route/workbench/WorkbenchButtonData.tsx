import * as React from 'react';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';

const buttons = [
  {
    name: 'Terminal',
    endpoint: '',
    icon: <TerminalOutlinedIcon />,
  },
  {
    name: 'Desktop',
    endpoint: '',
    icon: <DesktopWindowsOutlinedIcon />,
  },
  {
    name: 'VSCode',
    endpoint: '',
    icon: <CodeOutlinedIcon />,
  },
  {
    name: 'JupyterLab',
    endpoint: '',
    icon: <ScienceOutlinedIcon />,
  },
  // Add more buttons as needed
];

export default buttons;
