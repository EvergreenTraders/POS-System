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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormHelperText,
  InputLabel,
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
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [bucketType, setBucketType] = useState('general');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  // Sample data - replace with actual data from your backend
  const scrapItems = [
    {
      id: 'SCRP-001',
      name: 'Gold Scrap 14K',
      category: 'Gold',
      price: 875.50,
      dateAdded: '2025-09-15'
    },
    {
      id: 'SCRP-002',
      name: 'Silver Scrap',
      category: 'Silver',
      price: 89.99,
      dateAdded: '2025-09-10'
    },
    {
      id: 'SCRP-003',
      name: 'Broken Gold Chain',
      category: 'Gold',
      price: 525.75,
      dateAdded: '2025-09-05'
    }
  ];

  const handleNewScrap = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenCreateDialog(false);
    setBucketName('');
    setBucketType('general');
    setDescription('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!bucketName.trim()) newErrors.bucketName = 'Bucket name is required';
    if (bucketName.length > 50) newErrors.bucketName = 'Name must be less than 50 characters';
    if (description.length > 255) newErrors.description = 'Description must be less than 255 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBucket = () => {
    if (!validateForm()) return;
    
    // Here you would typically make an API call to create the scrap bucket
    console.log('Creating scrap bucket:', {
      name: bucketName,
      type: bucketType,
      description: description
    });
    
    // Reset form and close dialog
    handleCloseDialog();
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };


  const filteredItems = scrapItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
      {/* Create Scrap Bucket Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Scrap Bucket</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Bucket Name"
              type="text"
              fullWidth
              variant="outlined"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              error={!!errors.bucketName}
              helperText={errors.bucketName || 'A unique name for your scrap bucket'}
            />
            
            <FormControl fullWidth error={!!errors.bucketType}>
              <InputLabel id="bucket-type-label">Bucket Type</InputLabel>
              <Select
                labelId="bucket-type-label"
                value={bucketType}
                label="Bucket Type"
                onChange={(e) => setBucketType(e.target.value)}
              >
                <MenuItem value="gold">Gold</MenuItem>
                <MenuItem value="silver">Silver</MenuItem>
                <MenuItem value="platinum">Platinum</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
              <FormHelperText>{errors.bucketType || 'Select the type of scrap for this bucket'}</FormHelperText>
            </FormControl>
            
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!errors.description}
              helperText={errors.description || 'Optional: Add notes about this scrap bucket'}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateBucket} 
            variant="contained"
            color="primary"
          >
            Create Bucket
          </Button>
        </DialogActions>
      </Dialog>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Scrap Bucket
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your scrap inventory and transactions
          </Typography>
        </Box>
        <TextField
          placeholder="Search scrap..."
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
          sx={{ width: 300 }}
        />
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewScrap}
        >
          Create Scrap Bucket
        </Button>
      </Box>

      {/* Scrap Items Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Item Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Date Added</TableCell>
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
                  <TableCell>{formatCurrency(item.price)}</TableCell>
                  <TableCell>{formatDate(item.dateAdded)}</TableCell>
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
                    {searchTerm  !== 'all' 
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