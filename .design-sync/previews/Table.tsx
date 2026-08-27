import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption,
  Badge,
} from 'opus-dashboard-ui'

export const BookingsTable = () => (
  <Table>
    <TableCaption>Today's appointments</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Time</TableHead>
        <TableHead>Client</TableHead>
        <TableHead>Service</TableHead>
        <TableHead>Status</TableHead>
        <TableHead style={{ textAlign: 'right' }}>Price</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>09:00</TableCell>
        <TableCell>Marco Rossi</TableCell>
        <TableCell>Skin fade</TableCell>
        <TableCell><Badge variant="default">Confirmed</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>£28</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>09:45</TableCell>
        <TableCell>Sofia Petrov</TableCell>
        <TableCell>Cut &amp; blow dry</TableCell>
        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>£45</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>10:30</TableCell>
        <TableCell>Aiden Jones</TableCell>
        <TableCell>Beard trim</TableCell>
        <TableCell><Badge variant="destructive">No-show</Badge></TableCell>
        <TableCell style={{ textAlign: 'right' }}>£12</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell colSpan={4}>Total</TableCell>
        <TableCell style={{ textAlign: 'right' }}>£85</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
)
