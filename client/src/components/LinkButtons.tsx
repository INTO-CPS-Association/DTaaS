import React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import styled from '@emotion/styled';
import { SvgIconProps } from '@mui/material';

export interface Button {
  name: string;
  endpoint: string;
  icon: React.ReactElement<SvgIconProps>;
}

interface LinkButtonsProps {
  buttons: Button[];
  link?: string;
}

const StyledIconButton = styled(IconButton)`
  margin: 8px;
`;

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

const customIconSize = 100;

const LinkButtons: React.FC<LinkButtonsProps> = ({ buttons, link }) => {
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <ButtonRow>
      {buttons.map((button, index) => (
        <Tooltip key={index} title={link + button.endpoint}>
          <IconLabel>
            <StyledIconButton onClick={() => openLink(link + button.endpoint)}>
              {React.cloneElement(button.icon, {
                style: { fontSize: customIconSize },
              })}
            </StyledIconButton>
            {button.name}
          </IconLabel>
        </Tooltip>
      ))}
    </ButtonRow>
  );
};

export default LinkButtons;
