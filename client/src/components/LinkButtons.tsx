import React, { cloneElement } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styled from '@emotion/styled';
import { KeyLinkPair } from 'util/envUtil';
import { Typography } from '@mui/material';
import LinkIcons from 'components/LinkIconsLib';

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
});

interface IconButtonData {
  link: string;
  icon: React.ReactElement;
  name: string | undefined;
}
const getIconButtons = (buttons: KeyLinkPair[]): IconButtonData[] =>
  buttons.map((button) => {
    const iconData = LinkIcons[button.key.toUpperCase()];

    return {
      link: button.link,
      icon: iconData.icon,
      name: iconData.name,
    };
  });

interface LinkButtonProps {
  buttons: KeyLinkPair[];
  size?: number;
  marginRight?: number;
}

/**
 * @description Renders a row of buttons with icons and labels. The buttons open a new tab with the link.
 * @param buttons: KeyLinkPair[] (required) - an array of objects with a key and link
 * @param size: number (optional) - the size of the icons
 * @param marginRight: number (optional) - the margin right to be applied to each button
 * @returns React.ReactElement - a row of buttons with icons and labels
 * @example
 * const linkValues = getWorkbenchLinkValues();
 * <LinkButtons buttons={linkValues} size={6} />
 */ const LinkButtons = ({ buttons, size, marginRight }: LinkButtonProps) => {
  const iconButtons = getIconButtons(buttons);
  const root = document.getElementById('root');
  return (
    <ButtonRow>
      {iconButtons.map((button, index) => (
        <div
          key={index}
          style={{ marginRight: marginRight ? `${marginRight}px` : '0px' }}
        >
          <Tooltip
            key={index}
            title={button.link}
            PopperProps={{ container: root }}
          >
            <IconLabel>
              <IconButton
                onClick={() => {
                  window.open(button.link, '_blank');
                }}
                role="link"
                {...(button.name !== 'ToolbarIcon' && {
                  title: `${button.name}-btn`,
                })}
              >
                {cloneElement(
                  button.icon as React.ReactElement<{
                    style?: React.CSSProperties;
                  }>,
                  {
                    style: { fontSize: `${size ?? 4}rem` },
                  },
                )}
              </IconButton>
              {button.name !== 'ToolbarIcon' && (
                <Typography variant="h6">{button.name}</Typography>
              )}
            </IconLabel>
          </Tooltip>
        </div>
      ))}
    </ButtonRow>
  );
};

export default LinkButtons;
export { default as LinkIcons } from 'components/LinkIconsLib';
