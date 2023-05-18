import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Button, CardActions, Grid, Icon, SxProps, Theme } from '@mui/material';
import styled from '@emotion/styled';
import AddButton from 'components/AssetBoard/AddButton';
import { Asset } from 'models/Asset';

interface CardProps {
  asset: Asset;
  sx?: SxProps<Theme>;
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
  overflow: hidden;
  text-overflow: ellipsis;
`;

function CardActionAreaContainer(asset: Asset) {
  return (
    <Grid container>
      <Grid item xs={7}>
        <CardContent
          sx={{
            padding: '5px 0px 0px 0px',
            ':last-child': { paddingBottom: 0 },
          }}
        >
          <Description variant="body2" color="text.secondary">
            {asset.description}
          </Description>
        </CardContent>
      </Grid>
      <Grid item xs={5} textAlign={'end'} sx={{ width: 100 }}>
        <Icon sx={{ fontSize: 80 }}>folder</Icon>
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
    </CardActions>
  );
}

function AssetCard(props: CardProps) {
  const { asset: data, sx } = props;

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 235,
        height: 170,
        justifyContent: 'space-between',
        padding: '5px 10px 5px 10px',
        ...sx,
      }}
    >
      <Header variant="h6">{data.name}</Header>
      <CardActionAreaContainer {...data} />
      <CardButtonsContainer {...data} />
    </Card>
  );
}

export default AssetCard;
