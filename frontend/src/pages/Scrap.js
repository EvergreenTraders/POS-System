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
  ListItemText,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const Scrap = () => {
  const API_BASE_URL = config.apiUrl;
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
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
  const [bucketTotalCosts, setBucketTotalCosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null
  });

  const [completeDialog, setCompleteDialog] = useState({
    open: false,
    bucket: null
  });

  // Fetch scrap buckets from API
  const fetchScrapBuckets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scrap/buckets`);
      setScrapBuckets(response.data);

      // Calculate total cost for each bucket
      await calculateBucketTotalCosts(response.data);

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

  // Calculate total costs for all buckets
  const calculateBucketTotalCosts = async (buckets) => {
    const costs = {};

    for (const bucket of buckets) {
      if (bucket.item_id && bucket.item_id.length > 0) {
        try {
          // Fetch items for this bucket
          const itemPromises = bucket.item_id.map(id =>
            axios.get(`${API_BASE_URL}/jewelry/${id}`)
              .then(res => res.data)
              .catch(err => {
                console.error(`Error fetching item ${id}:`, err);
                return null;
              })
          );

          const items = await Promise.all(itemPromises);
          const validItems = items.filter(item => item !== null);

          // Calculate total cost
          const totalCost = validItems.reduce((total, item) => {
            const itemPrice = parseFloat(item.item_price || item.buy_price || item.retail_price || 0);
            return total + itemPrice;
          }, 0);

          costs[bucket.bucket_id] = totalCost;
        } catch (err) {
          console.error(`Error calculating cost for bucket ${bucket.bucket_id}:`, err);
          costs[bucket.bucket_id] = 0;
        }
      } else {
        costs[bucket.bucket_id] = 0;
      }
    }

    setBucketTotalCosts(costs);
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
        const validItems = items.filter(item => item !== null);
        setBucketItems(validItems);
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

      // Select the first bucket by default (most recently created)
      if (buckets && buckets.length > 0) {
        handleBucketSelect(buckets[0]);
      }
    };

    initialize();
  }, []);
  
  // Update selected bucket when scrapBuckets changes
  useEffect(() => {
    if (scrapBuckets.length > 0 && !selectedBucket) {
      // Select the first bucket (most recently created)
      handleBucketSelect(scrapBuckets[0]);
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

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const filteredBuckets = scrapBuckets.filter(bucket => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      bucket.bucket_name.toLowerCase().includes(searchLower) ||
      (bucket.notes && bucket.notes.toLowerCase().includes(searchLower)) ||
      `SCRP-${bucket.bucket_id}`.toLowerCase().includes(searchLower)
    );

    // Filter by status
    const bucketStatus = bucket.status || 'ACTIVE';
    const matchesStatus = statusFilter === 'ALL' || bucketStatus === statusFilter;

    return matchesSearch && matchesStatus;
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

  // Helper function to get proper image URL
  const getImageUrl = (images) => {
    const placeholderImage = 'https://via.placeholder.com/150';

    const makeAbsoluteUrl = (url) => {
      if (!url) return placeholderImage;

      // Ensure url is a string
      if (typeof url !== 'string') {
        return placeholderImage;
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (url.startsWith('/uploads')) {
        const serverBase = config.apiUrl.replace('/api', '');
        return `${serverBase}${url}`;
      }
      return url;
    };

    try {
      // If images is a string, try to parse it
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images);
        } catch (e) {
          return placeholderImage;
        }
      }

      // If images is an array and has at least one element
      if (Array.isArray(images) && images.length > 0) {
        // Find the primary image first, or use the first image
        const primaryImage = images.find(img => img.isPrimary === true);
        const imageToUse = primaryImage || images[0];

        // Extract the URL from the image object
        let imageUrl;
        if (typeof imageToUse === 'string') {
          imageUrl = imageToUse;
        } else if (imageToUse && typeof imageToUse === 'object') {
          imageUrl = imageToUse.url || imageToUse.image_url || imageToUse.path;
        }

        if (imageUrl) {
          return makeAbsoluteUrl(imageUrl);
        }
      }

      return placeholderImage;
    } catch (error) {
      console.error('Error processing image URL:', error);
      return placeholderImage;
    }
  };

  // Calculate total cost of all items in the bucket
  const calculateTotalCost = () => {
    return bucketItems.reduce((total, item) => {
      const itemPrice = parseFloat(item.item_price || item.buy_price || item.retail_price || 0);
      return total + itemPrice;
    }, 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total weight from bucket items
  const calculateTotalWeight = () => {
    return bucketItems.reduce((total, item) => {
      const weight = parseFloat(item.metal_weight || item.weight_grams || 0);
      return total + weight;
    }, 0);
  };

  // Calculate weighted average purity
  const calculateAveragePurity = () => {
    const totalWeight = calculateTotalWeight();
    if (totalWeight === 0) return 0;

    const weightedPuritySum = bucketItems.reduce((sum, item) => {
      const weight = parseFloat(item.metal_weight || item.weight_grams || 0);
      const purity = parseFloat(item.purity_value || 0);
      return sum + (weight * purity);
    }, 0);

    return weightedPuritySum / totalWeight;
  };

  // Calculate estimated melt value
  const calculateMeltValue = () => {
    return bucketItems.reduce((total, item) => {
      const meltValue = parseFloat(item.melt_value || 0);
      return total + meltValue;
    }, 0);
  };

  // Handle refresh after creating a bucket
  const handleBucketCreated = () => {
    fetchScrapBuckets();
  };

  // Open confirmation dialog
  const handleDeleteClick = (item) => {
    setConfirmDialog({
      open: true,
      item: item
    });
  };

  // Close confirmation dialog
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      item: null
    });
  };

  // Handle delete item from scrap bucket (after confirmation)
  const handleDeleteItem = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    // Close dialog
    handleCloseConfirmDialog();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update the jewelry item status back to AVAILABLE
      await axios.put(
        `${API_BASE_URL}/jewelry/${item.item_id}`,
        { status: 'AVAILABLE' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove item from the scrap bucket's item_id array
      const updatedItemIds = selectedBucket.item_id.filter(id => id !== item.item_id);

      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        { item_id: updatedItemIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the buckets and bucket items
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error removing item from scrap bucket:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to remove item from scrap bucket';
      setError(errorMessage);
    }
  };

  // Open complete bucket confirmation dialog
  const handleCompleteClick = (bucket) => {
    setCompleteDialog({
      open: true,
      bucket: bucket
    });
  };

  // Close complete bucket confirmation dialog
  const handleCloseCompleteDialog = () => {
    setCompleteDialog({
      open: false,
      bucket: null
    });
  };

  // Handle marking bucket as COMPLETE (after confirmation)
  const handleMarkComplete = async () => {
    const bucket = completeDialog.bucket;
    if (!bucket) return;

    // Close dialog
    handleCloseCompleteDialog();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update bucket status to COMPLETE with employee ID
      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${bucket.bucket_id}`,
        {
          status: 'COMPLETE',
          updated_by: currentUser?.employee_id || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the buckets
      const updatedBuckets = await fetchScrapBuckets();
      const completedBucket = updatedBuckets.find(b => b.bucket_id === bucket.bucket_id);

      // If the completed bucket was selected, refresh its items
      if (selectedBucket?.bucket_id === bucket.bucket_id && completedBucket) {
        handleBucketSelect(completedBucket);
      }

      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error marking bucket as complete:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to mark bucket as complete';
      setError(errorMessage);
    }
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Buckets</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
                <MenuItem value="SHIPPED">Shipped</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="COMPLETE">Complete</MenuItem>
                <MenuItem value="ALL">All</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
                      backgroundColor: '#c8e6c9',
                      '&:hover': {
                        backgroundColor: '#c8e6c9',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={bucket.bucket_name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textSecondary">
                          Items: {bucket.item_id?.length || 0}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" fontWeight="bold" color="primary">
                          Total: {formatCurrency(bucketTotalCosts[bucket.bucket_id] || 0)}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      fontWeight: selectedBucket?.bucket_id === bucket.bucket_id ? 'bold' : 'normal',
                    }}
                  />
                  <Chip
                    label={bucket.status || 'ACTIVE'}
                    color={
                      bucket.status === 'ACTIVE' ? 'success' :
                      bucket.status === 'COMPLETE' ? 'info' :
                      bucket.status === 'PROCESSING' ? 'warning' :
                      bucket.status === 'SHIPPED' ? 'primary' :
                      'default'
                    }
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
              {/* Bucket Header with Info */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {selectedBucket.bucket_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selectedBucket.status !== 'COMPLETE' && bucketItems.length > 0 && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleCompleteClick(selectedBucket)}
                      >
                        Mark as Complete
                      </Button>
                    )}
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
                </Box>

                {/* Bucket Details Grid */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Date Created
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(selectedBucket.created_at)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Status Date
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(selectedBucket.updated_at)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Total Items
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {bucketItems.length}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Total Weight
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {calculateTotalWeight().toFixed(2)} g
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Calculated Purity
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {(calculateAveragePurity() * 100).toFixed(2)}%
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Estimated Melt Value
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="primary">
                      {formatCurrency(calculateMeltValue())}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Metal Type Summary and Items Table */}
              {bucketItems.length > 0 ? (
                <>
                  <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Image</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Weight (g)</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bucketItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_id || 'N/A'}</TableCell>

                          <TableCell>
                            <Box
                              key={`img-${item.item_id}`}
                              component="img"
                              src={getImageUrl(item.images)}
                              alt={item.long_desc || 'Item'}
                              sx={{
                                width: 50,
                                height: 50,
                                objectFit: 'cover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                              onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = `https://via.placeholder.com/50?text=No+Image`;
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.long_desc || 'Unnamed Item'}</TableCell>
                          <TableCell>{parseFloat(item.metal_weight || item.weight_grams || 0).toFixed(2)}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(item.item_price || item.buy_price || item.retail_price || 0))}</TableCell>
                          <TableCell>
                            <Tooltip title="Remove from Scrap" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(item)}
                              >
                                <RemoveCircleOutlineIcon fontSize="small" color="error" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </TableContainer>
                </>
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

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          Move Item to Inventory?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move this item back to inventory?
          </Typography>
          {confirmDialog.item && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Item ID:</strong> {confirmDialog.item.item_id}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Description:</strong> {confirmDialog.item.long_desc || 'Unnamed Item'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteItem} variant="contained" color="primary">
            Yes, Move to Inventory
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Mark as Complete */}
      <Dialog
        open={completeDialog.open}
        onClose={handleCloseCompleteDialog}
        aria-labelledby="complete-dialog-title"
      >
        <DialogTitle id="complete-dialog-title">
          Mark Bucket as Complete?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this bucket as complete?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
            Warning: All items in this bucket will be marked as "SOLD TO REFINER" and removed from active inventory.
          </Typography>
          {completeDialog.bucket && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Bucket:</strong> {completeDialog.bucket.bucket_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Number of Items:</strong> {completeDialog.bucket.item_id?.length || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleMarkComplete} variant="contained" color="success">
            Yes, Mark as Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Scrap;