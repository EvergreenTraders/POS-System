import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Button, Box, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Dialog, DialogActions, DialogContent, DialogTitle, Grid, Tooltip, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import config from '../config';

const API_BASE_URL = config.apiUrl;

const Hardgoods = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { addItem } = useCart();

  // State
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTrackingType, setSelectedTrackingType] = useState('');

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, [selectedStatus, selectedCategory, selectedTrackingType]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hardgoods/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedTrackingType) params.append('tracking_type', selectedTrackingType);

      const response = await axios.get(`${API_BASE_URL}/hardgoods?${params.toString()}`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching hardgoods:', error);
      enqueueSnackbar('Error loading inventory', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter items by search query
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.item_id?.toLowerCase().includes(query) ||
      item.short_desc?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query) ||
      item.serial_number?.toLowerCase().includes(query)
    );
  });

  const handleRowClick = (item) => {
    setSelectedItem(item);
  };

  const handleEditClick = (item) => {
    navigate('/hardgoods-edit', { state: { item } });
  };

  const handleAddToCart = async (item) => {
    if (item.status !== 'ACTIVE') {
      enqueueSnackbar('Only ACTIVE items can be added to cart', { variant: 'warning' });
      return;
    }

    try {
      addItem({
        item_id: item.item_id,
        description: item.short_desc,
        price: parseFloat(item.retail_price) || 0,
        quantity: 1,
        inventory_type: 'hardgoods',
        tracking_type: item.tracking_type,
        max_quantity: item.quantity_available
      });
      enqueueSnackbar('Item added to cart', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error adding to cart', { variant: 'error' });
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/hardgoods/${itemToDelete.item_id}`);
      setItems(items.filter(i => i.item_id !== itemToDelete.item_id));
      setSelectedItem(null);
      enqueueSnackbar('Item deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error deleting item', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const getTrackingTypeColor = (type) => {
    switch (type) {
      case 'ITEM': return 'primary';
      case 'SKU': return 'secondary';
      case 'HYBRID': return 'info';
      case 'BUCKET': return 'warning';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'HOLD': return 'warning';
      case 'SOLD': return 'default';
      case 'PAWN': return 'info';
      case 'SCRAP': return 'error';
      default: return 'default';
    }
  };

  const getImageUrl = (images) => {
    if (!images || images.length === 0) return null;
    const img = Array.isArray(images) ? images[0] : images;
    if (typeof img === 'string') return img;
    if (img?.url) return img.url;
    return null;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Hardgoods Inventory</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/hardgoods-edit')}
        >
          Add New Item
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: <SearchIcon color="action" />
              }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="HOLD">Hold</MenuItem>
                <MenuItem value="IN_PROCESS">In Process</MenuItem>
                <MenuItem value="SOLD">Sold</MenuItem>
                <MenuItem value="PAWN">Pawn</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tracking Type</InputLabel>
              <Select
                value={selectedTrackingType}
                label="Tracking Type"
                onChange={(e) => setSelectedTrackingType(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ITEM">Item</MenuItem>
                <MenuItem value="SKU">SKU</MenuItem>
                <MenuItem value="HYBRID">Hybrid</MenuItem>
                <MenuItem value="BUCKET">Bucket</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="text.secondary">
              {filteredItems.length} items found
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Table */}
        <Grid item xs={12} md={selectedItem ? 9 : 12}>
          <TableContainer component={Paper}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Age</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.item_id}
                      hover
                      selected={selectedItem?.item_id === item.item_id}
                      onClick={() => handleRowClick(item)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{item.item_id}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{item.short_desc || '-'}</Typography>
                          {item.brand && (
                            <Typography variant="caption" color="text.secondary">
                              {item.brand} {item.model}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.tracking_type}
                          size="small"
                          color={getTrackingTypeColor(item.tracking_type)}
                        />
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatPrice(item.retail_price)}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          size="small"
                          color={getStatusColor(item.status)}
                        />
                      </TableCell>
                      <TableCell align="right">{item.age_days || 0}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {item.status === 'ACTIVE' && (
                            <Tooltip title="Add to Cart">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                              >
                                <ShoppingCartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {item.status === 'HOLD' && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>
                          No items found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Grid>

        {/* Detail Panel */}
        {selectedItem && (
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              {/* Image */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                {getImageUrl(selectedItem.images) ? (
                  <img
                    src={getImageUrl(selectedItem.images)}
                    alt={selectedItem.short_desc}
                    style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 150, height: 150, backgroundColor: '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto', borderRadius: 1
                    }}
                  >
                    <Typography color="text.secondary">No Image</Typography>
                  </Box>
                )}
              </Box>

              {/* Basic Info */}
              <Typography variant="h6" gutterBottom>{selectedItem.short_desc}</Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                {formatPrice(selectedItem.retail_price)}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={selectedItem.status} color={getStatusColor(selectedItem.status)} size="small" />
                <Chip label={selectedItem.tracking_type} color={getTrackingTypeColor(selectedItem.tracking_type)} size="small" />
              </Box>

              {/* Details */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Details</Typography>
              <Box sx={{ display: 'grid', gap: 0.5, fontSize: '0.875rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Item ID:</Typography>
                  <Typography variant="body2">{selectedItem.item_id}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Category:</Typography>
                  <Typography variant="body2">{selectedItem.category_name}</Typography>
                </Box>
                {selectedItem.brand && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Brand:</Typography>
                    <Typography variant="body2">{selectedItem.brand}</Typography>
                  </Box>
                )}
                {selectedItem.model && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Model:</Typography>
                    <Typography variant="body2">{selectedItem.model}</Typography>
                  </Box>
                )}
                {selectedItem.serial_number && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Serial #:</Typography>
                    <Typography variant="body2">{selectedItem.serial_number}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Condition:</Typography>
                  <Typography variant="body2">{selectedItem.condition}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Quantity:</Typography>
                  <Typography variant="body2">{selectedItem.quantity} ({selectedItem.quantity_available} avail)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Cost:</Typography>
                  <Typography variant="body2">{formatPrice(selectedItem.cost_price)}</Typography>
                </Box>
                {selectedItem.location && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Location:</Typography>
                    <Typography variant="body2">{selectedItem.location}</Typography>
                  </Box>
                )}
              </Box>

              {selectedItem.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Notes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.notes}
                  </Typography>
                </Box>
              )}

              {/* Actions */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => handleEditClick(selectedItem)}
                >
                  Edit
                </Button>
                {selectedItem.status === 'ACTIVE' && (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAddToCart(selectedItem)}
                  >
                    Add to Cart
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete item <strong>{itemToDelete?.item_id}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {itemToDelete?.short_desc}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Hardgoods;
