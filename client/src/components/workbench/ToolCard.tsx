/**
 * One workbench tool, as a card.
 *
 * It is a real anchor, not a button that calls `window.open`. The
 * previous control was an icon button carrying `role="link"`, which says the
 * markup already knew it was a link. Making it one means a screen reader
 * announces it correctly, and middle click and "copy link address" work.
 *
 * Every card is a separate workbench service, so it opens in a new tab with
 * `noopener`. An address this application refuses to open is not a link at all
 * and the card says so instead of looking clickable and doing nothing. The
 * in-application pages that once sat here now live on the Automation page,
 * which follows them in the same tab.
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

const actionSx = {
  height: '100%',
  p: 2.5,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 1,
};

/**
 * The clickable area, as the destination requires. Returned as an element so
 * the tooltip can attach its ref to the control a keyboard reaches.
 */
function actionArea(
  link: string,
  children: React.ReactNode,
): React.ReactElement {
  if (!isSafeHttpUrl(link)) {
    return (
      <CardActionArea component="div" disabled aria-disabled sx={actionSx}>
        {children}
      </CardActionArea>
    );
  }

  return (
    <CardActionArea
      component="a"
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      sx={actionSx}
    >
      {children}
    </CardActionArea>
  );
}

function ToolCard({
  name,
  link,
  description,
  icon,
}: Readonly<ToolCardProps>) {
  const usable = isSafeHttpUrl(link);
  const opensElsewhere = usable;

  const body = (
    <>
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
        {/* Marks the card as leaving the page, so it is on the cards that do.
            It is decorative because the link text already carries the name. */}
        {opensElsewhere && (
          <OpenInNewIcon
            aria-hidden="true"
            sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
          />
        )}
      </Box>

      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}

      {/* A tool whose address this application will not open says so, in
          place of looking clickable and doing nothing. */}
      {!usable && (
        <Typography variant="body2" color="error">
          This tool is misconfigured and cannot be opened.
        </Typography>
      )}
    </>
  );

  return (
    <Card sx={{ height: '100%' }}>
      {/* The tooltip wraps the link and not the card, so the address it names
          is announced on the element a keyboard can actually reach.
          `describeChild` makes it the description: without it MUI would use
          the address as the link's name, and the name is the tool. */}
      <Tooltip
        title={
          usable
            ? link
            : `${name} is configured with an address this application will not open: ${link}`
        }
        describeChild
      >
        {actionArea(link, body)}
      </Tooltip>
    </Card>
  );
}

export default ToolCard;
