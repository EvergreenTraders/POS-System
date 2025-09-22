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
  InputAdornment,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const Scrap = () => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Sample data - replace with actual data from your backend
  const scrapItems = [
    {
      id: 'SCRP-001',
      name: 'Gold Scrap 14K',
      weight: '25g',
      purity: '14K',
      category: 'Gold',
      price: 875.50,
      dateAdded: '2025-09-15',
      status: 'IN_STOCK'
    },
    {
      id: 'SCRP-002',
      name: 'Silver Scrap',
      weight: '100g',
      purity: '925',
      category: 'Silver',
      price: 89.99,
      dateAdded: '2025-09-10',
      status: 'SOLD'
    },
    {
      id: 'SCRP-003',
      name: 'Broken Gold Chain',
      weight: '15g',
      purity: '18K',
      category: 'Gold',
      price: 525.75,
      dateAdded: '2025-09-05',
      status: 'IN_STOCK'
    }
  ];

  const getStatusChip = (status) => {
    const statusConfig = {
      IN_STOCK: { label: 'In Stock', color: 'success' },
      SOLD: { label: 'Sold', color: 'default' },
      PROCESSING: { label: 'Processing', color: 'warning' }
    };

    return (
      <Chip 
        label={statusConfig[status]?.label || status} 
        color={statusConfig[status]?.color || 'default'} 
        size="small"
      />
    );
  };

  const handleNewScrap = () => {
    // Implement new scrap item functionality
    console.log('Add new scrap item');
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    setCurrentPage(1);
  };

  const filteredItems = scrapItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Scrap Items
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your scrap inventory and transactions
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewScrap}
        >
          Add Scrap Item
        </Button>
      </Box>

      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search scrap items..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <Select
          value={filter}
          onChange={handleFilterChange}
          size="small"
          sx={{ minWidth: 150 }}
          startAdornment={
            <InputAdornment position="start">
              <FilterAltIcon />
            </InputAdornment>
          }
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="IN_STOCK">In Stock</MenuItem>
          <MenuItem value="SOLD">Sold</MenuItem>
          <MenuItem value="PROCESSING">Processing</MenuItem>
        </Select>
      </Box>

      {/* Scrap Items Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Item Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Purity</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Date Added</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.purity}</TableCell>
                  <TableCell>{item.weight}</TableCell>
                  <TableCell>{formatCurrency(item.price)}</TableCell>
                  <TableCell>{formatDate(item.dateAdded)}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {searchTerm || filter !== 'all' 
                      ? 'No scrap items match your search criteria.' 
                      : 'No scrap items found. Click "Add Scrap Item" to get started.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
        </Typography>
        <Box>
          <IconButton 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    </Container>
  );
};

export default Scrap;