import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Button, CardActions, Grid } from '@mui/material';
import styled from '@emotion/styled';
import AddButton from 'components/asset/AddButton';
import StartStopButton from './StartStopButton';
import LogButton from './LogButton';
import { Asset } from './Asset';

interface AssetCardProps {
  asset: Asset;
  tab?: string;
}

const Header = styled(Typography)`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  white-space. nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Description = styled(Typography)`
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
`;

const formatName = (name: string) =>
  name
    .replace(/-/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

function CardActionAreaContainer(asset: Asset) {
  return (
    <Grid container>
      <Grid item xs={12}>
        <CardContent
          sx={{
            padding: '5px 0px 0px 0px',
            ':last-child': { paddingBottom: 0 },
            maxHeight: '85px', // Definisci un'altezza massima
            overflowY: 'auto',   // Abilita lo scroll quando necessario
            width: '100%',      // Imposta la larghezza al 100%
            justifyContent: 'flex-start',
          }}
        >
          <Description variant="body2" color="text.secondary">
            {asset.description}
          </Description>
        </CardContent>
      </Grid>
    </Grid>
  );
}

function CardButtonsContainer(asset: Asset) {
  return (
    <CardActions>
      {asset.description && (
        <Button variant="contained" fullWidth size="small" color="primary">
          Details
        </Button>
      )}
      <AddButton {...asset} />
      <StartStopButton/>
      <LogButton/>
    </CardActions>
  );
}

function CardButtonsContainerExecute() {
  return (
    <CardActions style={{justifyContent: 'flex-end'}}>
      <StartStopButton/>
      <LogButton/>
    </CardActions>
  );
  
}

function AssetCard({ asset, tab }: AssetCardProps) {

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 235,
        height: 170,
        justifyContent: 'space-between',
        padding: '5px 10px 5px 10px',
      }}
    >
      <Header variant="h6">{formatName(asset.name)}</Header>
      <CardActionAreaContainer {...asset} />
      {tab === "Execute" ? (
        <CardButtonsContainerExecute />
      ) : (
        <CardButtonsContainer {...asset} />
      )}
    </Card>
  );
}



export default AssetCard;