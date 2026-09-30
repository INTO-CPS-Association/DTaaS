/**
 * A grid of cards, each one a link to a page of this application.
 *
 * The Automation and Insights pages are both a short list of in-application
 * destinations, so they share one card. Each card follows its route with the
 * router, never a new tab: a new tab starts with an empty sessionStorage, where
 * the OIDC session is kept, so the route guard would send the person to sign in
 * again.
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

export interface NavigationCard {
  name: string;
  description: string;
  to: string;
  icon: React.ReactElement;
}

function NavigationCards({
  cards,
}: Readonly<{ cards: readonly NavigationCard[] }>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      }}
    >
      {cards.map((card) => (
        <Card key={card.to} sx={{ height: '100%' }}>
          <CardActionArea
            component={RouterLink}
            to={card.to}
            sx={{
              height: '100%',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 2,
                backgroundColor: 'primary.light',
                color: 'primary.dark',
                mb: 0.5,
                '& > svg': { fontSize: '1.5rem' },
              }}
            >
              {card.icon}
            </Box>
            <Typography variant="h6" component="h2">
              {card.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.description}
            </Typography>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}

export default NavigationCards;
