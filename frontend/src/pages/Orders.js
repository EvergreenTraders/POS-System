import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from '@mui/material';

function Orders() {
  const [orders] = useState([
    {
      id: 1,
      date: '2023-04-20',
      total: 29.97,
      status: 'Completed',
      items: 3,
    },
    {
      id: 2,
      date: '2023-04-20',
      total: 49.98,
      status: 'Pending',
      items: 2,
    },
    {
      id: 3,
      date: '2023-04-19',
      total: 99.99,
      status: 'Completed',
      items: 5,
    },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div>
      {/* <Typography variant="h4" gutterBottom>
        Orders
      </Typography> */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.items}</TableCell>
                <TableCell>${order.total}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default Orders;
