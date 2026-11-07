import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

/** One sensor of a profile, ready to show. */
export interface SensorRow {
  readonly key: string;
  readonly depth: string;
  readonly quantity: string;
  readonly device: string;
  readonly reading: string;
}

interface ProfileTableProps {
  readonly profile: string;
  readonly rows: readonly SensorRow[];
}

/** The sensors of one soil profile, downwards. Knows nothing about DTaaS. */
function ProfileTable({ profile, rows }: ProfileTableProps) {
  const heading = `profile-${profile}`;
  return (
    <section aria-labelledby={heading}>
      <Typography id={heading} variant="h6" component="h2" sx={{ mt: 2 }}>
        Profile {profile}
      </Typography>
      <Table size="small" aria-labelledby={heading}>
        <TableHead>
          <TableRow>
            <TableCell>Depth</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Device</TableCell>
            <TableCell align="right">Latest Reading</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{row.depth}</TableCell>
              <TableCell>{row.quantity}</TableCell>
              <TableCell>{row.device}</TableCell>
              <TableCell align="right">{row.reading}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export default ProfileTable;
