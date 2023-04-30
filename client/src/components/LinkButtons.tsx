import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styled from '@emotion/styled';
import { KeyLinkPair } from 'util/envUtil';
import { Typography } from '@mui/material';
import LinkIcons from './LinkIconsLib';

const IconLabel = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  fontSize: '14px',
});

const ButtonRow = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '50px',
});

interface IconButtonData {
  link: string;
  icon: React.ReactElement;
  name: string;
}
const getIconButtons = (buttons: KeyLinkPair[]): IconButtonData[] =>
  buttons.map((button) => {
    const iconData = LinkIcons[button.key.toUpperCase()] || LinkIcons.NO_ICON;
    return {
      link: button.link,
      icon: iconData.icon,
      name: iconData.name || button.key,
    };
  });

interface LinkButtonProps {
  buttons: KeyLinkPair[];
  size?: number;
}

/**
 * @description Renders a row of buttons with icons and labels. The buttons open a new tab with the link.
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
              role="link"
              title={`${button.name}-btn`}
            >
              {React.cloneElement(button.icon, {
                style: { fontSize: `${size?.toString() ?? 4}rem` },
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
export { default as LinkIcons } from './LinkIconsLib';
