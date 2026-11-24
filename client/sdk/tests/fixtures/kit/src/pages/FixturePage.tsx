import { Typography } from '@mui/material';
import { useHost } from '@into-cps-association/dtaas-sdk';

/** A page that reads the host, so mounting it proves the host reaches it. */
export default function FixturePage() {
  const user = useHost().auth.useUser();
  return (
    <Typography variant="h4" component="h1">
      Fixture for {user?.username ?? 'nobody'}
    </Typography>
  );
}
