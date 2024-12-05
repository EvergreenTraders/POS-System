import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Alert,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Pawns = () => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sample data - replace with actual data from your backend
  const pawns = [
    {
      id: 'P001',
      item: 'Gold Necklace 24K',
      customer: 'John Smith',
      amount: 1200,
      dueDate: 'Mar 14, 2024',
      status: 'ACTIVE'
    },
    {
      id: 'P002',
      item: 'Diamond Ring',
      customer: 'Sarah Johnson',
      amount: 2500,
      dueDate: 'Feb 19, 2024',
      status: 'OVERDUE'
    }
  ];

  const getStatusChip = (status) => {
    const styles = {
      ACTIVE: {
        backgroundColor: '#e7f7ed',
        color: '#1a8d48',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      },
      OVERDUE: {
        backgroundColor: '#fce8e8',
        color: '#d32f2f',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }
    };

    return (
      <span style={styles[status]}>
        {status}
      </span>
    );
  };

  const handleNewPawn = () => {
    // Implement new pawn functionality
    console.log('New pawn clicked');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Pawn Transactions
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage active and completed pawn transactions
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<FilterAltIcon />}
            sx={{ mr: 2 }}
          >
            Filter
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewPawn}
            sx={{
              backgroundColor: '#00a862',
              '&:hover': {
                backgroundColor: '#008f53'
              }
            }}
          >
            New Pawn
          </Button>
        </Box>
      </Box>

      {/* Alert */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Attention: There are 2 pawns due this week. Please review and contact customers.
        </Typography>
      </Alert>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PAWN ID</TableCell>
              <TableCell>ITEM</TableCell>
              <TableCell>CUSTOMER</TableCell>
              <TableCell>AMOUNT</TableCell>
              <TableCell>DUE DATE</TableCell>
              <TableCell>STATUS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pawns.map((pawn) => (
              <TableRow key={pawn.id} hover>
                <TableCell>{pawn.id}</TableCell>
                <TableCell>{pawn.item}</TableCell>
                <TableCell>{pawn.customer}</TableCell>
                <TableCell>{formatCurrency(pawn.amount)}</TableCell>
                <TableCell>{pawn.dueDate}</TableCell>
                <TableCell>{getStatusChip(pawn.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(e.target.value)}
            size="small"
            sx={{ mr: 1 }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
          <Typography variant="body2" color="text.secondary">
            items per page
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="body2" sx={{ mx: 2 }}>
            Page {currentPage} of 10
          </Typography>
          <IconButton onClick={() => setCurrentPage(prev => prev + 1)}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    </Container>
  );
};

export default Pawns;
