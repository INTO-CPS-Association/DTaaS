import React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styled from '@emotion/styled';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { KeyLinkPair } from 'util/envUtil';
import { Typography } from '@mui/material';

const IconLabel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 14px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 50px;
`;

type LinkIconsType = {
  [key: string]: { icon: React.ReactElement; name: string };
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
    name: '',
  },
};

interface IconButton {
  link: string;
  icon: React.ReactElement;
  name: string;
}
const getIconButtons = (buttons: KeyLinkPair[]): IconButton[] =>
  buttons.map((button) => {
    const iconData = LinkIcons[button.key.toUpperCase()] || LinkIcons.NO_ICON;
    return {
      link: button.link,
      icon: iconData.icon,
      name: iconData.name || button.link,
    };
  });

interface LinkButtonProps {
  buttons: KeyLinkPair[];
  size?: number;
}

/**
 * @description Renders a row of buttons with icons and labels. The buttons open a new tab with the link.
 * @category Component
  * @param buttons: KeyLinkPair[] (required) - an array of objects with a key and link
  * @param size: number (optional) - the size of the icons
  * @returns React.ReactElement - a row of buttons with icons and labels
  * @example
  * const linkValues = getWorkbenchLinkValues();
  * <LinkButtons buttons={linkValues} size={6} />

 */ const LinkButtons = ({ buttons, size }: LinkButtonProps) => {
  const iconButtons = getIconButtons(buttons);
  return (
    <ButtonRow>
      {iconButtons.map((button, index) => (
        <Tooltip key={index} title={button.link}>
          <IconLabel>
            <IconButton
              onClick={() => {
                window.open(button.link, '_blank');
              }}
            >
              {React.cloneElement(button.icon, {
                style: { fontSize: `${size?.toString()}rem` },
              })}
            </IconButton>
            <Typography variant="h6">{button.name}</Typography>
          </IconLabel>
        </Tooltip>
      ))}
    </ButtonRow>
  );
};

export default LinkButtons;
