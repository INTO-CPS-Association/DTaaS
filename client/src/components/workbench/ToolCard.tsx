/**
 * One workbench tool, as a card.
 *
 * It is a real anchor, not a button that calls `window.open`. The
 * previous control was an icon button carrying `role="link"`, which says the
 * markup already knew it was a link. Making it one means a screen reader
 * announces it correctly, and middle click and "copy link address" work.
 */

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { isSafeHttpUrl } from 'util/safeUrl';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface ToolCardProps {
  name: string;
  link: string;
  description?: string;
  icon: React.ReactElement;
}

function ToolCard({ name, link, description, icon }: Readonly<ToolCardProps>) {
  const href = isSafeHttpUrl(link) ? link : undefined;

  return (
    // The card carries no padding of its own, so the link fills it and there
    // is no ring of dead space around a surface that is meant to be one link.
    <Card sx={{ height: '100%', p: 0 }}>
      {/* The tooltip wraps the link and not the card, so the address it names
          is announced on the element a keyboard can actually reach.
          `describeChild` makes it the description: without it MUI would use
          the address as the link's name, and the name is the tool. */}
      <Tooltip title={link} describeChild>
        <CardActionArea
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
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
              // The icon is sized here instead of being cloned with a style,
              // which would overwrite whatever the icon already carried.
              '& > svg': { fontSize: '1.5rem' },
            }}
          >
            {icon}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              width: '100%',
            }}
          >
            <Typography variant="h6" component="h2">
              {name}
            </Typography>
            {/* Marks the card as leaving the page. It is decorative because
                the link text already carries the name. */}
            <OpenInNewIcon
              aria-hidden="true"
              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
            />
          </Box>

          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </CardActionArea>
      </Tooltip>
    </Card>
  );
}

export default ToolCard;
