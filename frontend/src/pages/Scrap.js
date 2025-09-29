import React, { useState, useEffect } from 'react';
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
  Chip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const Scrap = () => {
  const API_BASE_URL = config.apiUrl;
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [bucketType, setBucketType] = useState('general');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const { currentUser } = useAuth();

  const [scrapBuckets, setScrapBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch scrap buckets from API
  const fetchScrapBuckets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scrap/buckets`);
      setScrapBuckets(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching scrap buckets:', err);
      setError('Failed to load scrap buckets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch buckets on component mount
  useEffect(() => {
    fetchScrapBuckets();
  }, []);

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

  const handleCreateBucket = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/scrap/buckets`, {
        bucket_name: bucketName,
        notes: description,
        created_by: currentUser?.employee_id || 1,
        status: 'ACTIVE'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Reset form and close dialog
      handleCloseDialog();
      
    } catch (error) {
      console.error('Error creating scrap bucket:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create scrap bucket. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setErrors(prev => ({
        ...prev,
        form: errorMessage
      }));
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };


  const filteredBuckets = scrapBuckets.filter(bucket => {
    const searchLower = searchTerm.toLowerCase();
    return (
      bucket.bucket_name.toLowerCase().includes(searchLower) ||
      (bucket.notes && bucket.notes.toLowerCase().includes(searchLower)) ||
      `SCRP-${bucket.bucket_id}`.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBuckets.length / itemsPerPage);
  const paginatedBuckets = filteredBuckets.slice(
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

  // Handle refresh after creating a bucket
  const handleBucketCreated = () => {
    fetchScrapBuckets();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Scrap Buckets
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewScrap}
        >
          New Bucket
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search buckets..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Scrap Buckets List */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bucket ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedBuckets.length > 0 ? (
                  paginatedBuckets.map((bucket) => (
                    <TableRow key={bucket.bucket_id}>
                      <TableCell>SCRP-{bucket.bucket_id}</TableCell>
                      <TableCell>{bucket.bucket_name}</TableCell>
                      <TableCell>{bucket.item_count || 0}</TableCell>
                      <TableCell>
                        <Chip 
                          label={bucket.status || 'ACTIVE'} 
                          color={bucket.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(bucket.created_at).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {bucket.notes || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => { /* Handle edit */ }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => { /* Handle delete */ }}>
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      {searchTerm ? 'No matching buckets found' : 'No scrap buckets available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <IconButton 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Box display="flex" alignItems="center" mx={1}>
                Page {currentPage} of {totalPages}
              </Box>
              <IconButton
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          )}
        </>
      )}
      
      {/* Create Scrap Bucket Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseDialog}>
        <DialogTitle>Create New Scrap Bucket</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleCreateBucket} sx={{ mt: 2 }}>
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
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateBucket} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Scrap;