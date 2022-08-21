import * as React from 'react';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Title from '../../page/Title';

// Generate Data of Past DT Runs
function createData(id, date, name) {
  return {
    id,
    date,
    name,
  };
}

const rows = [
  createData(
    0,
    '16 Mar, 2022',
    'Agrointelli Factory',
  ),
  createData(1, '10 May, 2022', 'Mass Spring Dampner'),
  createData(
    2,
    '16 August, 2022',
    'Electroingenium Rotary Dryer',
  ),
];

function preventDefault(event) {
  event.preventDefault();
}

export default function RecentRuns() {
  return (
    /* jshint ignore:start */
    <React.Fragment>
      <Title>Recent Runs</Title>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Link color="primary" href="#" onClick={preventDefault} sx={{ mt: 3 }}>
        See more
      </Link>
    </React.Fragment>
    /* jshint ignore:end */
  );
}
