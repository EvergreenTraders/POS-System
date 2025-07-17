import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import debounce from 'lodash/debounce';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Autocomplete,
  TextField,
  InputAdornment,
  MenuItem,
  Snackbar,
  Alert,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  IconButton,
  Select,
  InputLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useAuth } from '../context/AuthContext';
import config from '../config';

// Utility functions for pricing analysis and image handling
const formatPrice = (price) => {
  return Number(price).toFixed(2);
};

// Function to get image URL for jewelry items
const getImageUrl = (item) => {
  if (!item) return '/placeholder-jewelry.png';
  return item.image_url || '/placeholder-jewelry.png';
};

const calculatePercentage = (value, base) => {
  if (!base || base === 0 || !value) return 'N/A';
  const percentage = (value / base) * 100;
  return `${percentage.toFixed(0)}%`;
};

const calculateProfitMargin = (retailPrice, costBasis) => {
  if (!retailPrice || !costBasis || retailPrice <= 0 || costBasis <= 0) {
    return 'N/A';
  }
  const profit = retailPrice - costBasis;
  const margin = (profit / retailPrice) * 100;
  return `${margin.toFixed(0)}%`;
};

function JewelryEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const API_BASE_URL = config.apiUrl;

  // State variables
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tax, setTax] = useState({ rate: 0.13, amount: 0 }); // Default tax rate of 13%
  const [totalAmount, setTotalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'
  const [transactionType, setTransactionType] = useState('retail'); // 'sell' or 'retail'

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      if (location.state?.itemId) {
        await fetchJewelryItem(location.state.itemId);
      } else {
        setLoading(false);
        setSnackbar({
          open: true,
          message: 'No jewelry item selected',
          severity: 'warning'
        });
      }
    };

    fetchData();
  }, [location.state]);

  useEffect(() => {
    if (item) {
      // Initialize selling price with retail price
      setSellingPrice(item.retail_price || 0);
    }
  }, [item]);

  useEffect(() => {
    // Calculate tax and total amount when selling price or discount changes
    calculateTotals();
  }, [sellingPrice, discount, discountType]);

  // Fetch functions
  const fetchJewelryItem = async (itemId) => {
    try {
      setLoading(true);
      console.log(`Fetching jewelry item with ID: ${itemId}`);
      
      // Fetch all jewelry items like in Jewelry.js
      const response = await axios.get(`${API_BASE_URL}/jewelry`);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid data received from the server');
      }
      
      // Find the specific item by item_id
      const foundItem = response.data.find(item => item.item_id === itemId);
      
      if (!foundItem) {
        throw new Error(`Item with ID ${itemId} not found`);
      }
      
      console.log('Jewelry item found:', foundItem);
      
      // Set the jewelry item data to state
      setItem(foundItem);
  
      // Set initial edited item state for form
      setEditedItem({
        ...foundItem,
        inventory_status: foundItem.inventory_status || 'HOLD',
        short_desc: foundItem.short_desc || '',
        dimensions: foundItem.dimensions || '',
        gemstone: foundItem.gemstone || '',
        stone_weight: foundItem.stone_weight || '',
        stone_color_clarity: foundItem.stone_color_clarity || '',
        serial_number: foundItem.serial_number || '',
        age_year: foundItem.age_year || '',
        certification: foundItem.certification || ''
      });
  
      // Set initial price based on retail price
      setSellingPrice(foundItem.retail_price || 0);
      
      // Success notification
      setSnackbar({
        open: true,
        message: `Loaded jewelry item ${itemId} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error fetching jewelry item:', error);
      setItem(null); // Reset item state on error
      setSnackbar({
        open: true,
        message: `Failed to load jewelry item: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Customer search function
  const fetchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        params: { search: searchTerm }
      });
      
      if (response.data) {
        setSearchResults(response.data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching for customers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to search for customers',
        severity: 'error'
      });
    }
  };

  // Debounce customer search
  const debouncedSearch = useCallback(
    debounce((term) => fetchCustomers(term), 500),
    []
  );

  // Handlers
  const handleBackToInventory = () => {
    navigate('/inventory');
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCustomerSelection = (customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setSearchQuery(`${customer.first_name} ${customer.last_name}`);
    setShowSearchResults(false);
  };

  const handleSaveItem = async () => {
    try {
      setIsSaving(true);
      
      // Update item with edited values
      const response = await axios.put(`${API_BASE_URL}/jewelry/${item.id}`, editedItem);
      
      // Update local state with the response
      setItem(response.data);
      setEditedItem(response.data);
      setIsEditing(false);
      
      setSnackbar({
        open: true,
        message: 'Item updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating item:', error);
      setSnackbar({
        open: true,
        message: `Failed to update item: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original item data
    setEditedItem({
      ...item,
      inventory_status: item.inventory_status || 'HOLD',
      short_desc: item.short_desc || '',
      dimensions: item.dimensions || '',
      gemstone: item.gemstone || '',
      stone_weight: item.stone_weight || '',
      stone_color_clarity: item.stone_color_clarity || '',
      serial_number: item.serial_number || '',
      age_year: item.age_year || '',
      certification: item.certification || ''
    });
    setIsEditing(false);
  };

  const calculateTotals = () => {
    let discountedPrice = sellingPrice;
    
    // Apply discount
    if (discountType === 'percentage') {
      discountedPrice = sellingPrice - (sellingPrice * (discount / 100));
    } else {
      discountedPrice = sellingPrice - discount;
    }
    
    // Ensure price doesn't go negative
    discountedPrice = Math.max(0, discountedPrice);
    
    // Calculate tax
    const taxAmount = discountedPrice * tax.rate;
    setTax(prev => ({ ...prev, amount: taxAmount }));
    
    // Set total amount
    setTotalAmount(discountedPrice + taxAmount);
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toFixed(2);
  };

  // Render loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Render error state if no item
  if (!item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          gap: 3 
        }}>
          <Typography variant="h6" color="error">
            No jewelry item selected. Please select an item from the inventory.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToInventory}
          >
            Back to Inventory
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Jewelry Item Management
          </Typography>
          
          {/* Edit/Save Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleBackToInventory}
              startIcon={<ArrowBackIcon />}
            >
              Back to Inventory
            </Button>
            {isEditing ? (
                  <>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleCancel}
                      startIcon={<CancelIcon />}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveItem}
                      startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsEditing(true)}
                    startIcon={<EditIcon />}
                  >
                    Edit Item
                  </Button>
                )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Item Details Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Item Details
              </Typography>
              
              {/* Item Image and Basic Info */}
              <Box sx={{ display: 'flex', mb: 3 }}>
                {/* Item Image */}
                <Box sx={{ width: 150, mr: 3 }}>
                  <img 
                    src={getImageUrl(item)}
                    alt={item.short_desc || 'Jewelry item'}
                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                  />
                </Box>
                
                {/* Basic Item Info */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {item.short_desc || 'Jewelry Item'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    ID: {item.item_id}
                  </Typography>
                  
                  {/* Inventory Status Chip */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={item.inventory_status || 'HOLD'} 
                      color={item.inventory_status === 'IN-STOCK' ? 'success' : 
                             item.inventory_status === 'IN-PROCESS' ? 'info' : 'warning'} 
                      size="small" 
                      sx={{ height: 24 }}
                    />
                    {item.certification && (
                      <Chip 
                        label={`Certified: ${item.certification}`}
                        color="info"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
              
              {/* Editable Fields in Grid Layout */}
              <Grid container spacing={2}>
                {/* Inventory Status - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Inventory Status *
                  </Typography>
                  {isEditing ? (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      name="inventory_status"
                      value={editedItem.inventory_status || 'HOLD'}
                      onChange={handleInputChange}
                      margin="dense"
                    >
                      <MenuItem value="HOLD">HOLD</MenuItem>
                      <MenuItem value="IN-PROCESS">IN-PROCESS</MenuItem>
                      <MenuItem value="IN-STOCK">IN-STOCK</MenuItem>
                    </TextField>
                  ) : (
                    <Typography variant="body2">
                      {item.inventory_status || 'HOLD'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Description - Editable */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Description *
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="short_desc"
                      value={editedItem.short_desc || ''}
                      onChange={handleInputChange}
                      margin="dense"
                    />
                  ) : (
                    <Typography variant="body1">
                      {item.short_desc || 'No description available'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Metal Type - Read-only for now */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Type
                  </Typography>
                  <Typography variant="body2">
                    {item.metal_type || 'N/A'}
                  </Typography>
                </Grid>
                
                {/* Purity - Read-only for now */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Purity
                  </Typography>
                  <Typography variant="body2">
                    {item.metal_purity}
                  </Typography>
                </Grid>
                
                {/* Metal Weight - Read-only for now */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Weight
                  </Typography>
                  <Typography variant="body2">
                    {item.metal_weight}g
                  </Typography>
                </Grid>
                
                {/* Metal Value - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Value
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="metal_value"
                      type="number"
                      value={editedItem.metal_value || 0}
                      onChange={handleInputChange}
                      margin="dense"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  ) : (
                    <Typography variant="body2">
                      ${formatPrice(item.metal_value || 0)}
                    </Typography>
                  )}
                </Grid>
                
                {/* Dimensions - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Dimensions
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="dimensions"
                      value={editedItem.dimensions || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      placeholder="e.g., 25mm x 15mm"
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.dimensions || 'N/A'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Gemstone - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Gemstone
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="gemstone"
                      value={editedItem.gemstone || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      placeholder="e.g., Diamond"
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.gemstone || 'None'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Stone Weight - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Stone Weight
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="stone_weight"
                      value={editedItem.stone_weight || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">ct</InputAdornment>
                      }}
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.stone_weight ? `${item.stone_weight} ct` : 'N/A'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Stone Color/Clarity - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Stone Color/Clarity
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="stone_color_clarity"
                      value={editedItem.stone_color_clarity || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      placeholder="e.g., G/VS1"
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.stone_color_clarity || 'N/A'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Serial Number - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Serial Number
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="serial_number"
                      value={editedItem.serial_number || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      InputProps={{
                        style: { fontFamily: 'monospace' }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {item.serial_number || 'N/A'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Age/Year - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Age/Year
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="age_year"
                      value={editedItem.age_year || ''}
                      onChange={handleInputChange}
                      margin="dense"
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.age_year || 'Unknown'}
                    </Typography>
                  )}
                </Grid>
                
                {/* Certification - Editable */}
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Certification
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      size="small"
                      name="certification"
                      value={editedItem.certification || ''}
                      onChange={handleInputChange}
                      margin="dense"
                      placeholder="e.g., GIA"
                    />
                  ) : (
                    <Typography variant="body2">
                      {item.certification || 'None'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Sale Details Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Sale Details
              </Typography>
              
              {/* Transaction Type */}
              <FormControl fullWidth margin="normal">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  label="Transaction Type"
                >
                  <MenuItem value="sell">Sell</MenuItem>
                  <MenuItem value="retail">Retail</MenuItem>
                </Select>
              </FormControl>
              
              {/* Pricing Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Pricing Information
              </Typography>

              {/* Cost Basis */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Cost Basis
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    name="cost_basis"
                    type="number"
                    value={editedItem.cost_basis || 0}
                    onChange={handleInputChange}
                    margin="dense"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                ) : (
                  <Typography variant="body1" fontWeight="medium">
                    ${formatPrice(item.cost_basis || 0)}
                  </Typography>
                )}
              </Box>

              {/* Metal Value */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Metal Value
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    name="metal_value"
                    type="number"
                    value={editedItem.metal_value || 0}
                    onChange={handleInputChange}
                    margin="dense"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                ) : (
                  <Typography variant="body1">
                    ${formatPrice(item.metal_value || 0)}
                  </Typography>
                )}
              </Box>

              {/* Retail Price */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                  Retail Price
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    name="retail_price"
                    type="number"
                    value={editedItem.retail_price || 0}
                    onChange={handleInputChange}
                    margin="dense"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                ) : (
                  <Typography variant="body1" color="success.main" fontWeight="medium">
                    ${formatPrice(item.retail_price || 0)}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Markup Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Markup Analysis
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {/* Cost to Metal Value */}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Metal Value / Cost
                    </Typography>
                    <Typography variant="body2">
                      {calculatePercentage(item.metal_value, item.cost_basis)}
                    </Typography>
                  </Grid>
                  
                  {/* Retail to Cost Markup */}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Retail / Cost
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      {calculatePercentage(item.retail_price, item.cost_basis)}
                    </Typography>
                  </Grid>
                  
                  {/* Profit Margin */}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Profit Margin
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {calculateProfitMargin(item.retail_price, item.cost_basis)}
                    </Typography>
                  </Grid>
                  
                  {/* Profit Amount */}
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Profit Amount
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      ${formatPrice((item.retail_price || 0) - (item.cost_basis || 0))}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default JewelryEdit;