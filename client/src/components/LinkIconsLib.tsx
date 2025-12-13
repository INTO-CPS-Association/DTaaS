import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GitHubIcon from '@mui/icons-material/GitHub';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TabIcon from '@mui/icons-material/Tab';
import LibraryBooksOutlined from '@mui/icons-material/LibraryBooksOutlined';

type LinkIconsType = {
  [key: string]: { icon: React.ReactElement; name: string | undefined };
};

const LinkIcons: LinkIconsType = {
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
  LIBRARY_PREVIEW: {
    icon: <LibraryBooksOutlined />,
    name: 'Library page preview',
  },
  DT_PREVIEW: {
    icon: <TabIcon />,
    name: 'Digital Twins page preview',
  },
  GITHUB: {
    icon: <GitHubIcon />,
    name: 'ToolbarIcon',
  },
  HELP: {
    icon: <HelpOutlineIcon />,
    name: 'ToolbarIcon',
  },
  NO_ICON: {
    icon: <OpenInNewIcon />,
    name: undefined,
  },
};

export default LinkIcons;
export { LinkIcons };
