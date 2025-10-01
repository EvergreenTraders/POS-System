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
  CircularProgress,
  List,
  ListItem,
  ListItemText
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
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [bucketItems, setBucketItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [bucketType, setBucketType] = useState('gold');
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
      return response.data; // Return the fetched data for chaining
    } catch (err) {
      console.error('Error fetching scrap buckets:', err);
      setError('Failed to load scrap buckets. Please try again later.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch items for a specific bucket
  const fetchBucketItems = async (bucket) => {
    try {
      setItemsLoading(true);      
      // If bucket has item_ids array, fetch the actual items
      if (bucket.item_id && bucket.item_id.length > 0) {
        // Fetch each item individually
        const itemPromises = bucket.item_id.map(id => 
          axios.get(`${API_BASE_URL}/jewelry/${id}`)
            .then(res => res.data)
            .catch(err => {
              console.error(`Error fetching item ${id}:`, err);
              return null; // Return null for failed requests
            })
        );
        
        // Wait for all requests to complete
        const items = await Promise.all(itemPromises);
        // Filter out any null values from failed requests
        setBucketItems(items.filter(item => item !== null));
      } else {
        // If no items, set empty array
        setBucketItems([]);
      }
    } catch (err) {
      console.error('Error fetching bucket items:', err);
      setError('Failed to load bucket items. Please try again.');
      setBucketItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  // Handle bucket selection
  const handleBucketSelect = (bucket) => {
    setSelectedBucket(bucket);
    fetchBucketItems(bucket);
  };

  // Fetch buckets on component mount
  useEffect(() => {
    const initialize = async () => {
      const buckets = await fetchScrapBuckets();
      
      // Find and select 'Gold scrap' bucket by default
      if (buckets && buckets.length > 0) {
        const goldBucket = buckets.find(bucket => 
          bucket.bucket_name && bucket.bucket_name.toLowerCase().includes('gold')
        );
        
        if (goldBucket) {
          handleBucketSelect(goldBucket);
        } else if (buckets.length > 0) {
          // If no gold bucket, select the first one
          handleBucketSelect(buckets[0]);
        }
      }
    };
    
    initialize();
  }, []);
  
  // Update selected bucket when scrapBuckets changes
  useEffect(() => {
    if (scrapBuckets.length > 0 && !selectedBucket) {
      const goldBucket = scrapBuckets.find(bucket => 
        bucket.bucket_name && bucket.bucket_name.toLowerCase().includes('gold')
      );
      
      if (goldBucket) {
        handleBucketSelect(goldBucket);
      } else {
        handleBucketSelect(scrapBuckets[0]);
      }
    }
  }, [scrapBuckets]);

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
      
      // Refresh buckets and select the new one
      const updatedBuckets = await fetchScrapBuckets();
      const newBucket = updatedBuckets.find(b => b.bucket_id === response.data.bucket_id);
      if (newBucket) {
        handleBucketSelect(newBucket);
      }
      
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
          <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
        {/* Bucket List */}
        <Paper sx={{ width: '30%', p: 2, maxHeight: '70vh', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>Buckets</Typography>
          <List>
            {paginatedBuckets.length > 0 ? (
              paginatedBuckets.map((bucket) => (
                <ListItem 
                  key={bucket.bucket_id}
                  button 
                  selected={selectedBucket?.bucket_id === bucket.bucket_id}
                  onClick={() => handleBucketSelect(bucket)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={bucket.bucket_name}
                    secondary={`${bucket.item_count || 0} items`}
                    primaryTypographyProps={{
                      fontWeight: selectedBucket?.bucket_id === bucket.bucket_id ? 'bold' : 'normal',
                    }}
                  />
                  <Chip 
                    label={bucket.status || 'ACTIVE'} 
                    color={bucket.status === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                {searchTerm ? 'No matching buckets found' : 'No scrap buckets available'}
              </Typography>
            )}
          </List>
        </Paper>

        {/* Bucket Items */}
        <Paper sx={{ flex: 1, p: 2, maxHeight: '70vh', overflow: 'auto' }}>
          {selectedBucket ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {selectedBucket.bucket_name} ({bucketItems.length} items)
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => { /* Handle add item */ }}
                >
                  Add Item
                </Button>
              </Box>
              
              {itemsLoading ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : bucketItems.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item ID</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bucketItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_id || 'N/A'}</TableCell>
                          <TableCell>{item.long_desc || 'Unnamed Item'}</TableCell>
                          <TableCell>{item.category || 'N/A'}</TableCell>
                          <TableCell>${item.item_price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => { /* Handle delete */ }}>
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography>No items in this bucket yet.</Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<AddIcon />} 
                    sx={{ mt: 2 }}
                    onClick={() => { /* Handle add item */ }}
                  >
                    Add First Item
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Select a bucket to view items</Typography>
            </Box>
          )}
        </Paper>
      </Box>

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