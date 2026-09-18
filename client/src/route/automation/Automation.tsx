/**
 * The Automation page.
 *
 * The library and digital twins previews are pages of this application, not
 * workbench services. They used to sit among the workbench cards, where the
 * page said each card opens a service in a new tab, which was true of neither.
 * They live here instead, as two cards that follow the route in this tab.
 *
 * The two routes are named here as constants. They are internal paths, not
 * deployment endpoints, so there is nothing to configure and the card follows
 * them with the router, never a new tab: a new tab starts with an empty
 * sessionStorage, where the OIDC session is kept, so the route guard would send
 * the person to sign in again.
 */

import Layout from 'page/Layout';
import PageShell from 'components/PageShell';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { LibraryIcon, DigitalTwinsIcon } from 'components/appIcons';

const DESCRIPTION =
  'The digital twins and library previews in one place. These features ' +
  'demonstrate the DTaaS integration with GitLab CI/CD and are experimental.';

interface AutomationCard {
  name: string;
  description: string;
  to: string;
  icon: React.ReactElement;
}

// Each card says what the page is, the way the workbench cards do, so the
// destination is readable without opening it.
const cards: AutomationCard[] = [
  {
    name: 'Library Page',
    description: 'The library page on its own, without the platform around it.',
    to: '/preview/library',
    icon: <LibraryIcon />,
  },
  {
    name: 'Digital Twins Page',
    description:
      'The digital twins page on its own, without the platform around it.',
    to: '/preview/digitaltwins',
    icon: <DigitalTwinsIcon />,
  },
];

function Automation() {
  return (
    <Layout>
      <PageShell title="Automation" description={DESCRIPTION}>
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
      </PageShell>
    </Layout>
  );
}

export default Automation;
