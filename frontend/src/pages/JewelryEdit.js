import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  Autocomplete,
  Chip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';

function JewelryEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const API_BASE_URL = config.apiUrl;

  // State variables
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState('sell'); // Default to sell
  const [sellingPrice, setSellingPrice] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [addingToCart, setAddingToCart] = useState(false);
  const [tax, setTax] = useState({ rate: 0.13, amount: 0 }); // Default tax rate of 13%
  const [totalAmount, setTotalAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'

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
      const response = await axios.get(`${API_BASE_URL}/jewelry/${itemId}`);
      setItem(response.data);
      
      // Set initial price based on retail price
      setSellingPrice(response.data.retail_price || 0);
    } catch (error) {
      console.error('Error fetching jewelry item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load jewelry item',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      const params = new URLSearchParams();
      
      // Check if search term might be a name or phone number
      if (searchTerm.match(/^\d+$/)) {
        params.append('phone', searchTerm);
      } else if (searchTerm.includes(' ')) {
        const [firstName, lastName] = searchTerm.split(' ', 2);
        params.append('first_name', firstName);
        params.append('last_name', lastName);
      } else {
        params.append('first_name', searchTerm);
      }
      
      const response = await axios.get(`${API_BASE_URL}/customers/search?${params.toString()}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  // Debounce customer search
  const debouncedSearch = useCallback(
    debounce((term) => fetchCustomers(term), 500),
    []
  );

  // Handlers
  const handleCustomerSearch = (event, value) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleCustomerSelect = (event, value) => {
    setCustomer(value);
  };

  const handleSellingPriceChange = (e) => {
    const value = parseFloat(e.target.value);
    setSellingPrice(isNaN(value) ? 0 : value);
  };

  const handleDiscountChange = (e) => {
    const value = parseFloat(e.target.value);
    setDiscount(isNaN(value) ? 0 : value);
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
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

  const handleAddToCart = async () => {
    if (!item) {
      setSnackbar({
        open: true,
        message: 'No jewelry item selected',
        severity: 'warning'
      });
      return;
    }

    if (!customer) {
      setSnackbar({
        open: true,
        message: 'Please select a customer',
        severity: 'warning'
      });
      return;
    }

    try {
      setAddingToCart(true);
      
      // Create cart item with all necessary details
      const cartItem = {
        id: Date.now(), // Temporary ID for the cart
        item_id: item.item_id,
        type: transactionType,
        description: `${item.metal_weight}g ${item.metal_purity} ${item.metal_type} ${item.short_desc || ''}`,
        price: sellingPrice,
        discountedPrice: totalAmount - tax.amount,
        tax: tax.amount,
        totalAmount: totalAmount,
        discount: discount,
        discountType: discountType,
        customer: {
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone
        },
        employee: {
          id: currentUser?.id,
          name: currentUser?.name,
          role: currentUser?.role
        },
        images: item.images,
        jewelry_data: item
      };
      
      // Get existing cart items from session storage
      const existingCartItems = JSON.parse(sessionStorage.getItem('cartItems')) || [];
      
      // Add new item to cart
      const updatedCart = [...existingCartItems, cartItem];
      
      // Save updated cart to session storage
      sessionStorage.setItem('cartItems', JSON.stringify(updatedCart));
      
      setSnackbar({
        open: true,
        message: 'Item added to cart successfully',
        severity: 'success'
      });
      
      // Navigate to cart after short delay
      setTimeout(() => {
        navigate('/cart');
      }, 1500);
      
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setSnackbar({
        open: true,
        message: 'Failed to add item to cart',
        severity: 'error'
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBackToInventory = () => {
    navigate('/jewelry');
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toFixed(2);
  };

  // Helper function to get image URL
  const getImageUrl = (images) => {
    // Default placeholder image
    const placeholderImage = 'https://via.placeholder.com/150';
    
    try {
      // If images is a string (JSON string), try to parse it
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images);
        } catch (e) {
          return placeholderImage;
        }
      }
      
      // If no images or empty array
      if (!images || !Array.isArray(images) || images.length === 0) {
        return placeholderImage;
      }
      
      // Try to find the primary image first
      const primaryImage = images.find(img => img.isPrimary === true || img.is_primary === true);
      
      // If primary image found
      if (primaryImage) {
        // Check for different possible URL structures
        if (primaryImage.url) return primaryImage.url;
        if (primaryImage.image_url) return primaryImage.image_url;
        if (typeof primaryImage === 'string') return primaryImage;
      }
      
      // Otherwise use the first image
      const firstImage = images[0];
      if (firstImage) {
        if (firstImage.url) return firstImage.url;
        if (firstImage.image_url) return firstImage.image_url;
        if (typeof firstImage === 'string') return firstImage;
      }
      
      return placeholderImage;
    } catch (error) {
      console.error('Error processing image:', error);
      return placeholderImage;
    }
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
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
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Sell Jewelry Item
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBackToInventory}
          >
            Back to Inventory
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Item Details Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Item Details
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 3 }}>
                {/* Item Image */}
                <Box sx={{ width: 150, mr: 3 }}>
                  <img 
                    src={getImageUrl(item.images)}
                    alt={item.name || 'Jewelry item'}
                    style={{ width: '100%', height: 'auto', borderRadius: 4 }}
                  />
                </Box>
                
                {/* Basic Info */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {item.item_id}
                  </Typography>
                  <Typography variant="body1">
                    {`${item.metal_weight}g ${item.metal_purity} ${item.metal_type}`}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {item.short_desc || 'No description'}
                  </Typography>
                  <Chip 
                    label={item.inventory_status || 'HOLD'}
                    color={item.inventory_status === 'AVAILABLE' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
              
              {/* Detailed Specs */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Category
                  </Typography>
                  <Typography variant="body2">
                    {item.metal_category || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Cost Basis
                  </Typography>
                  <Typography variant="body2">
                    ${formatPrice(item.cost_basis || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Metal Value
                  </Typography>
                  <Typography variant="body2">
                    ${formatPrice(item.metal_value || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Retail Price
                  </Typography>
                  <Typography variant="body2">
                    ${formatPrice(item.retail_price || 0)}
                  </Typography>
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
              
              {/* Customer Selection */}
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.phone || 'No Phone'})`}
                value={customer}
                onChange={handleCustomerSelect}
                inputValue={searchTerm}
                onInputChange={handleCustomerSearch}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Customer"
                    margin="normal"
                    fullWidth
                  />
                )}
              />
              
              {/* Price Details */}
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Selling Price"
                  type="number"
                  value={sellingPrice}
                  onChange={handleSellingPriceChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
                
                {/* Discount Section */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2 }}>
                  <TextField
                    label="Discount"
                    type="number"
                    value={discount}
                    onChange={handleDiscountChange}
                    sx={{ mr: 2, flex: 2 }}
                  />
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={discountType}
                      onChange={handleDiscountTypeChange}
                      label="Type"
                    >
                      <MenuItem value="percentage">%</MenuItem>
                      <MenuItem value="amount">$</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              {/* Totals Summary */}
              <Box sx={{ mt: 3, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Base Price:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      ${formatPrice(sellingPrice)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Discount ({discountType === 'percentage' ? `${discount}%` : `$${formatPrice(discount)}`}):
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right" color="error">
                      -${formatPrice(discountType === 'percentage' ? (sellingPrice * (discount / 100)) : discount)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      ${formatPrice(totalAmount - tax.amount)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">Tax ({(tax.rate * 100).toFixed(0)}%):</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" align="right">
                      ${formatPrice(tax.amount)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" align="right" fontWeight="bold">
                      ${formatPrice(totalAmount)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              {/* Add to Cart Button */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<AddShoppingCartIcon />}
                  onClick={handleAddToCart}
                  disabled={addingToCart || !customer}
                  sx={{ minWidth: 200 }}
                >
                  {addingToCart ? <CircularProgress size={24} color="inherit" /> : 'Add to Cart'}
                </Button>
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

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export default JewelryEdit;