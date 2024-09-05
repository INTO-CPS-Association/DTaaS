import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const DigitalTwinCard: React.FC<{
  name: string;
  description: string;
  buttons: React.ReactNode;
}> = (props) => (
  <Card
    style={{
      width: 300,
      height: 200,
      margin: '20px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}
  >
    <CardContent style={{ flex: 1, overflow: 'hidden' }}>
      <Typography variant="h5" component="div" gutterBottom>
        {props.name}
      </Typography>
      <div
        style={{
          maxHeight: '85px',
          overflowY: 'auto',
          paddingRight: '8px',
        }}
      >
        <Typography variant="body2" color="textSecondary">
          {props.description}
        </Typography>
      </div>
    </CardContent>
    {props.buttons}
  </Card>
);

export default DigitalTwinCard;
