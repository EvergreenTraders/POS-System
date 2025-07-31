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
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Checkbox
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DiamondIcon from '@mui/icons-material/Diamond';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import MetalEstimator from './MetalEstimator';

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

  // Handler for editing metal details
  const handleEditMetal = () => {
    // Open metal edit dialog instead of navigating
    setMetalDialogOpen(true);
  };

  // Handler for when metal data is saved in the dialog
  const handleMetalSave = (updatedMetal) => {
    
    // Apply the updated metal data to the item
    setItem(prevItem => ({
      ...prevItem,
      metal_type: updatedMetal.preciousMetalType,
      metal_weight: updatedMetal.weight,
      precious_metal_type_id: updatedMetal.preciousMetalTypeId,
      non_precious_metal_type: updatedMetal.nonPreciousMetalType,
      category: updatedMetal.metalCategory,
      metal_purity: updatedMetal.purity.purity,
      purity_value: updatedMetal.purity.value,
      jewelry_color: updatedMetal.jewelryColor,
      metal_value: updatedMetal.estimatedValue,
      spot_price: updatedMetal.spotPrice
    }));
    
    // Close the dialog
    setMetalDialogOpen(false);
  };
  
  // Handler for metal value changes
  const handleMetalValueChange = (value) => {
    // This function is required by MetalEstimator
  };

  // Handler for canceling metal edit
  const handleMetalCancel = () => {
    setMetalDialogOpen(false);
  };

  // Handler for editing gem details
  const handleEditGem = () => {
    // Initialize gem data based on existing item data
    if (item) {
      // Check if there are diamonds
      if (item.diamonds && item.diamonds.length > 0) {
        const primaryDiamond = item.diamonds.find(d => d.primary) || item.diamonds[0];
        
        // Determine color category based on color
        const color = primaryDiamond.color || 'D';
        let colorCategory = 'Colorless';
        if (color >= 'D' && color <= 'F') colorCategory = 'Colorless';
        else if (color >= 'G' && color <= 'J') colorCategory = 'Near Colorless';
        else if (color >= 'K' && color <= 'M') colorCategory = 'Faint Color';
        else if (color >= 'N' && color <= 'R') colorCategory = 'Very Light Color';
        else if (color >= 'S' && color <= 'Z') colorCategory = 'Light Color';
        
        // Find the shape index for navigation
        const shapeIndex = diamondShapes.findIndex(
          s => s.name.toLowerCase() === (primaryDiamond.shape || '').toLowerCase()
        );
        if (shapeIndex !== -1) {
          setCurrentShapeIndex(shapeIndex);
          // Fetch sizes for this diamond shape
          const shapeId = diamondShapes[shapeIndex].id || (shapeIndex + 1);
          fetchDiamondSizes(shapeId);
        }
        
        // Find the clarity index for image selection
        const clarityIndex = diamondClarity.findIndex(
          c => c.name.toLowerCase() === (primaryDiamond.clarity || '').toLowerCase()
        );
        if (clarityIndex !== -1) {
          setSelectedClarityIndex(clarityIndex);
        }
        
        setGemData(prev => ({
          ...prev,
          diamond: {
            shape: primaryDiamond.shape || 'Round',
            weight: primaryDiamond.weight || '',
            color: primaryDiamond.color || '',
            clarity: primaryDiamond.clarity || '',
            cut: primaryDiamond.cut || '',
            lab: primaryDiamond.lab || primaryDiamond.labGrown || false,
            quantity: primaryDiamond.quantity || '1',
            size: primaryDiamond.size || '',
            colorCategory: colorCategory,
            exactColor: primaryDiamond.color || 'D'
          },
          estimatedValue: primaryDiamond.value || '0'
        }));
        setGemTab('diamond');
      } 
      // Check if there are stones
      else if (item.stones && item.stones.length > 0) {
        const primaryStone = item.stones.find(s => s.primary) || item.stones[0];
        setGemData(prev => ({
          ...prev,
          stone: {
            type: primaryStone.type || '',
            weight: primaryStone.weight || '',
            shape: primaryStone.shape || 'Round',
            color: primaryStone.color || '',
            quantity: primaryStone.quantity || '1',
            size: primaryStone.size || ''
          },
          estimatedValue: primaryStone.value || '0'
        }));
        setGemTab('stone');
      }
    }
  
    // Open gem dialog
    setGemDialogOpen(true);
  };

  // Handler for closing gem dialog
  const handleGemDialogClose = () => {
    setGemDialogOpen(false);
  };

  // Handler for gem data changes
  const handleGemDataChange = (gemType, field, value) => {
    if (gemType === 'diamond' && field === 'shape') {
      // Update shape and find the corresponding index for navigation
      const shapeIndex = diamondShapes.findIndex(shape => shape.name === value);
      if (shapeIndex !== -1) {
        setCurrentShapeIndex(shapeIndex);
      }
    }
    
    // For color category selection, also update the exact color based on the category
    if (gemType === 'diamond' && field === 'colorCategory') {
      const exactColor = value === 'Colorless' ? 'D' :
                         value === 'Near Colorless' ? 'G' :
                         value === 'Faint Color' ? 'K' :
                         value === 'Very Light Color' ? 'N' :
                         value === 'Light Color' ? 'S' : 'D';
                         
      setGemData(prevData => ({
        ...prevData,
        diamond: {
          ...prevData.diamond,
          [field]: value,
          exactColor: exactColor
        }
      }));
    } else {
      // Standard field update
      setGemData(prevData => ({
        ...prevData,
        [gemType]: {
          ...prevData[gemType],
          [field]: value
        }
      }));
    }
  };
  
  // Handler for diamond shape navigation
  const handlePrevShape = () => {
    if (currentShapeIndex > 0) {
      const newIndex = currentShapeIndex - 1;
      const newShape = diamondShapes[newIndex];
      
      // Update the shape index
      setCurrentShapeIndex(newIndex);
      
      // Update the form with the new shape
      if (newShape) {        
        // Use the shape's actual ID or fallback to index+1
        const shapeId = newShape.id || (newIndex + 1);
        
        // Update gem data with the new shape
        handleGemDataChange('diamond', 'shape', newShape.name);
        
        // Reset size when changing shape
        handleGemDataChange('diamond', 'size', '');
        
        // Also fetch the sizes for this shape
        fetchDiamondSizes(shapeId);
      }
    }
  };

  const handleNextShape = () => {
    if (currentShapeIndex < diamondShapes.length - 1) {
      const newIndex = currentShapeIndex + 1;
      const newShape = diamondShapes[newIndex];
      
      // Update the shape index
      setCurrentShapeIndex(newIndex);
      
      // Update the form with the new shape
      if (newShape) {        
        // Use the shape's actual ID or fallback to index+1
        const shapeId = newShape.id || (newIndex + 1);
        
        // Update gem data with the new shape
        handleGemDataChange('diamond', 'shape', newShape.name);
        
        // Reset size when changing shape
        handleGemDataChange('diamond', 'size', '');
        
        // Also fetch the sizes for this shape
        fetchDiamondSizes(shapeId);
      }
    }
  };

  // Handler for saving gem updates
  const handleGemSave = (updatedGemData) => {
    // Update the item with new gem data
    setItem(prev => {
      // Get the appropriate gem data
      const newItem = { ...prev };
      
      if (updatedGemData.diamonds) {
        newItem.diamonds = updatedGemData.diamonds;
        // Update related fields
        const primaryDiamond = updatedGemData.diamonds.find(d => d.primary) || updatedGemData.diamonds[0];
        newItem.gemstone = 'Diamond';
        newItem.stone_weight = primaryDiamond.weight;
        newItem.stone_color_clarity = `${primaryDiamond.color}-${primaryDiamond.clarity}`;
      } else if (updatedGemData.stones) {
        newItem.stones = updatedGemData.stones;
        // Update related fields
        const primaryStone = updatedGemData.stones.find(s => s.primary) || updatedGemData.stones[0];
        newItem.gemstone = primaryStone.type;
        newItem.stone_weight = primaryStone.weight;
        newItem.stone_color_clarity = primaryStone.color;
      }
      
      // Also update the estimated value if provided
      if (gemData.estimatedValue) {
        if (newItem.diamonds && newItem.diamonds.length > 0) {
          newItem.diamonds[0].value = parseFloat(gemData.estimatedValue) || 0;
        } else if (newItem.stones && newItem.stones.length > 0) {
          newItem.stones[0].value = parseFloat(gemData.estimatedValue) || 0;
        }
      }
      
      return newItem;
    });
  
    setGemDialogOpen(false);
    setSnackbar({
      open: true,
      message: 'Gem details updated successfully',
      severity: 'success'
    });
  };

  // State variables
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gemDialogOpen, setGemDialogOpen] = useState(false);
  const [gemTab, setGemTab] = useState('diamond'); // Controls which gem tab is active
  const [gemData, setGemData] = useState({
    diamond: {
      shape: 'Round',
      weight: '',
      color: '',
      clarity: '',
      cut: '',
      labGrown: false,
      quantity: '1',
      size: '',
      colorCategory: 'Colorless',
      exactColor: 'D'
    },
    stone: {
      type: '',
      weight: '',
      shape: 'Round',
      color: '',
      quantity: '1',
      size: ''
    },
    estimatedValue: ''
  });
  
  // State for diamond shape navigation
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  
  // Diamond data states - initialized as empty arrays/values
  const [diamondShapes, setDiamondShapes] = useState([]);
  const [diamondClarity, setDiamondClarity] = useState([]);
  const [selectedClarityIndex, setSelectedClarityIndex] = useState(0);
  const [diamondCuts, setDiamondCuts] = useState([]);
  const [diamondColors, setDiamondColors] = useState([]);
  const [diamondSizes, setDiamondSizes] = useState([]);
  
  // Fetch diamond data on component mount
  useEffect(() => {
    const fetchDiamondData = async () => {
      try {
        // Fetch Diamond Shapes
        const shapesResponse = await axios.get(`${API_BASE_URL}/diamond_shape`);
        const shapesWithImages = shapesResponse.data.map(shape => ({
          id: shape.id,
          name: shape.shape,
          image: shape.image_path.replace('.jpg', '.png')
        }));
        setDiamondShapes(shapesWithImages);
        
        // If we have shapes, fetch sizes for the first shape
        if (shapesWithImages.length > 0) {
          const shapeId = shapesWithImages[0].id || 1;
          fetchDiamondSizes(shapeId);
        }

        // Fetch Diamond Clarity
        const clarityResponse = await axios.get(`${API_BASE_URL}/diamond_clarity`);
        const clarityWithImages = clarityResponse.data.map(clarity => ({
          name: clarity.name,
          image: clarity.image_path
        }));
        setDiamondClarity(clarityWithImages);

        // Fetch Diamond Cuts
        const cutsResponse = await axios.get(`${API_BASE_URL}/diamond_cut`);
        setDiamondCuts(cutsResponse.data);

        // Fetch Diamond Colors
        const diamondColorResponse = await axios.get(`${API_BASE_URL}/diamond_color`);
        setDiamondColors(diamondColorResponse.data);
      } catch (error) {
        console.error('Error fetching diamond data:', error);
        // Fallback to default shapes if API fails
        setDiamondShapes([
          { id: 1, name: 'Round', image: '/diamond-shapes/round.png' },
          { id: 2, name: 'Princess', image: '/diamond-shapes/princess.png' },
          { id: 3, name: 'Emerald', image: '/diamond-shapes/emerald.png' },
          { id: 4, name: 'Asscher', image: '/diamond-shapes/asscher.png' },
          { id: 5, name: 'Cushion', image: '/diamond-shapes/cushion.png' },
          { id: 6, name: 'Marquise', image: '/diamond-shapes/marquise.png' },
          { id: 7, name: 'Oval', image: '/diamond-shapes/oval.png' },
          { id: 8, name: 'Radiant', image: '/diamond-shapes/radiant.png' },
          { id: 9, name: 'Pear', image: '/diamond-shapes/pear.png' },
          { id: 10, name: 'Heart', image: '/diamond-shapes/heart.png' }
        ]);
      }
    };
    
    fetchDiamondData();
  }, []);
  
  // Function to fetch diamond sizes based on shape ID
  const fetchDiamondSizes = async (diamondShapeId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/diamond_size_weight/${diamondShapeId}`);
      setDiamondSizes(response.data);
    } catch (error) {
      console.error('Error fetching diamond sizes:', error);
      setDiamondSizes([]);
    }
  };
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
  const [metalDialogOpen, setMetalDialogOpen] = useState(false);
  const [updatedMetalData, setUpdatedMetalData] = useState(null);

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
      {/* Metal Estimator Dialog */}
      <Dialog
        open={metalDialogOpen}
        onClose={handleMetalCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: '90vh' } }}
      >
        <DialogTitle>Edit Metal Details</DialogTitle>
        <DialogContent dividers>
          {metalDialogOpen && (
            <MetalEstimator
              initialData={{
                // Pass both category and metalCategory to ensure proper initialization
                category: item?.category || 'Jewelry',
                metalCategory: item?.category || 'Jewelry',
                // Pass all other metal properties
                weight: item?.metal_weight || '',
                preciousMetalType: item?.metal_type || 'Gold',
                preciousMetalTypeId: item?.precious_metal_type_id || 1,
                nonPreciousMetalType: item?.non_precious_metal_type || '',
                jewelryColor: item?.jewelry_color || 'Yellow',
                purity: { 
                  purity: item?.metal_purity || '', 
                  value: item?.purity_value || 0 
                },
                spotPrice: item?.spot_price || 0,
                estimatedValue: item?.metal_value || 0
              }}
              onMetalValueChange={handleMetalValueChange}
              onAddMetal={handleMetalSave}
              buttonText="Save Metal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMetalCancel}>Cancel</Button>
        </DialogActions>
      </Dialog>

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
                
                {/* Metal Type with Edit Button */}
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Metal Type
                      </Typography>
                      <Typography variant="body2">
                        {item.metal_type || 'N/A'}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditMetal}
                    >
                      Edit Metal
                    </Button>
                  </Box>
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
                
                {/* Gemstone Details with Edit Button */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Gemstone Details
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditGem}
                    >
                      Edit Primary Gem
                    </Button>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Gemstone Type
                      </Typography>
                      <Typography variant="body2">
                        {item.gemstone || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Stone Weight
                      </Typography>
                      <Typography variant="body2">
                        {item.stone_weight ? `${item.stone_weight} ct` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">
                        Color/Clarity
                      </Typography>
                      <Typography variant="body2">
                        {item.stone_color_clarity || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
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

      {/* Gem Editing Dialog */}
      <Dialog
        open={gemDialogOpen}
        onClose={handleGemDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {/* Primary Gem Header */}
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>EST. PRIMARY GEM</Typography>
          
          {/* Diamond/Stone Selection */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <FormControl component="fieldset">
              <RadioGroup row value={gemTab} onChange={(e, newValue) => setGemTab(newValue)}>
                <FormControlLabel 
                  value="diamond" 
                  control={<Radio checked={gemTab === 'diamond'} />} 
                  label="Diamond" 
                  sx={{ 
                    '& .MuiFormControlLabel-label': { fontWeight: gemTab === 'diamond' ? 'bold' : 'normal' },
                    mr: 4
                  }}
                />
                <FormControlLabel 
                  value="stone" 
                  control={<Radio checked={gemTab === 'stone'} />} 
                  label="Stone" 
                  sx={{ '& .MuiFormControlLabel-label': { fontWeight: gemTab === 'stone' ? 'bold' : 'normal' } }}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Shape Section */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Shape <span style={{ color: 'red' }}>*</span>
              </Typography>
            </Grid>
            
            {/* Diamond Shape Image and Navigation */}
            <Grid item xs={4}>
              <Box sx={{ 
                position: 'relative', 
                height: '140px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <img 
                  src={diamondShapes[currentShapeIndex].image}
                  alt={diamondShapes[currentShapeIndex].name}
                  style={{ maxHeight: '120px', maxWidth: '120px' }}
                  onError={(e) => {
                    e.target.src = '/placeholder-diamond.png';
                  }}
                />
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: '50%', 
                  left: 0, 
                  right: 0, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  px: 1,
                  transform: 'translateY(50%)'
                }}>
                  <IconButton 
                    size="small"
                    sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                    onClick={handlePrevShape}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <IconButton 
                    size="small"
                    sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                    onClick={handleNextShape}
                  >
                    <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={8}>
              {/* Shape Selection */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  select
                  fullWidth
                  label="Select Shape"
                  value={gemTab === 'diamond' ? gemData.diamond.shape || 'Round' : gemData.stone.shape || ''}
                  onChange={(e) => handleGemDataChange(gemTab, 'shape', e.target.value)}
                >
                  {['Round', 'Oval', 'Emerald', 'Princess', 'Cushion', 'Marquise', 'Pear', 'Heart', 'Asscher', 'Other'].map(shape => (
                    <MenuItem key={shape} value={shape}>{shape}</MenuItem>
                  ))}
                </TextField>
              </Box>
              
              {/* Size */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Size
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Size"
                  value={gemTab === 'diamond' ? gemData.diamond.size || '' : gemData.stone.size || ''}
                  onChange={(e) => {
                    const selectedSize = e.target.value;
                    const selectedSizeObj = diamondSizes.find(sizeObj => sizeObj.size === selectedSize);
                    
                    if (selectedSizeObj && gemTab === 'diamond') {
                      // Update both size and weight based on selection
                      setGemData(prev => ({
                        ...prev,
                        diamond: {
                          ...prev.diamond,
                          size: selectedSize,
                          weight: selectedSizeObj.weight || prev.diamond.weight
                        }
                      }));
                    } else {
                      // Just update size for non-diamond or if no weight found
                      handleGemDataChange(gemTab, 'size', selectedSize);
                    }
                  }}
                >
                  <MenuItem value="">Select Size</MenuItem>
                  {diamondSizes.map(sizeObj => (
                    <MenuItem key={sizeObj.size} value={sizeObj.size}>
                      {sizeObj.size}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Grid>
          </Grid>

          {/* Quantity and Weight */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Typography variant="subtitle1">Quantity</Typography>
              <TextField
                fullWidth
                type="number"
                value={gemTab === 'diamond' ? gemData.diamond.quantity || '1' : gemData.stone.quantity || '1'}
                onChange={(e) => handleGemDataChange(gemTab, 'quantity', e.target.value)}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle1">
                Weight (carats) <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={gemTab === 'diamond' ? gemData.diamond.weight || '0' : gemData.stone.weight || '0'}
                onChange={(e) => handleGemDataChange(gemTab, 'weight', e.target.value)}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Grid>
          </Grid>

          {/* Color Selection - Only for Diamond */}
          {gemTab === 'diamond' && (
            <>
              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    Color <span style={{ color: 'red' }}>*</span>
                  </Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                {diamondColors.map((color) => (
                  <Paper
                    key={color.name}
                    elevation={gemData.diamond.color === color.name ? 8 : 1}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      width: 80,
                      height: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: color.color || '#fff',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => handleGemDataChange('diamond', 'color', color.name)}
                  >
                    <Typography variant="caption" align="center">
                      {color.name}
                    </Typography>
                    <Typography variant="caption" align="center">
                      {color.range}
                    </Typography>
                  </Paper>
                ))}
              </Box>
              
              {/* Diamond Cut Selection */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Cut <span style={{ color: 'red' }}>*</span>
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={gemData.diamond.cut || ''}
                  onChange={(e) => handleGemDataChange('diamond', 'cut', e.target.value)}
                >
                  {diamondCuts.map((cut) => (
                    <MenuItem key={cut.name} value={cut.name}>
                      {cut.name}
                    </MenuItem>
                  ))}
                </TextField>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={gemData.diamond.lab || false}
                      onChange={(e) => handleGemDataChange('diamond', 'lab', e.target.checked)}
                    />
                  }
                  label="Lab Grown"
                  sx={{ mt: 1 }}
                />
              </Box>
              
              {/* Diamond Clarity Selection */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Clarity <span style={{ color: 'red' }}>*</span>
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 2, 
                    mb: 2,
                    '&:focus-visible': {
                      outline: '2px solid #1976d2',
                      outlineOffset: '2px'
                    }
                  }}
                  tabIndex={0}
                >
                  {diamondClarity.map((clarity, index) => (
                    <Paper
                      key={clarity.name}
                      elevation={gemData.diamond.clarity === clarity.name ? 8 : 1}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                      }}
                      onClick={() => {
                        handleGemDataChange('diamond', 'clarity', clarity.name);
                        setSelectedClarityIndex(index);
                      }}
                    >
                      <Typography variant="caption" align="center">
                        {clarity.name}
                      </Typography>
                      {clarity.image && (
                        <img 
                          src={clarity.image} 
                          alt={clarity.name}
                          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.src = '/placeholder-clarity.png';
                          }}
                        />
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
              
              {/* Exact Color */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Exact Color: {gemData.diamond.exactColor || gemData.diamond.color || 'D'}
                </Typography>
              </Box>
            </>
          )}

          {/* Stone-specific fields - Only show when stone is selected */}
          {gemTab === 'stone' && (
            <Grid container spacing={2} sx={{ mt: 3 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Stone Type"
                  value={gemData.stone.type || ''}
                  onChange={(e) => handleGemDataChange('stone', 'type', e.target.value)}
                  required
                >
                  {['Ruby', 'Sapphire', 'Emerald', 'Amethyst', 'Aquamarine', 'Citrine', 'Garnet', 'Opal', 'Pearl', 'Peridot', 'Topaz', 'Turquoise', 'Other'].map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Color"
                  value={gemData.stone.color || ''}
                  onChange={(e) => handleGemDataChange('stone', 'color', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {/* Value Estimation - Hidden in the exact replica as it's not in the image */}
          <Box sx={{ display: 'none', mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Estimated Value</Typography>
            <TextField
              fullWidth
              label="Estimated Value ($)"
              type="number"
              value={gemData.estimatedValue || ''}
              onChange={(e) => setGemData(prev => ({ ...prev, estimatedValue: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGemDialogClose}>Cancel</Button>
          <Button 
            onClick={() => {
              const gemInfo = gemTab === 'diamond' 
                ? { diamonds: [{ 
                    ...gemData.diamond, 
                    primary: true,
                    quantity: gemData.diamond.quantity || 1,
                    exactColor: gemData.diamond.exactColor || 'D'
                  }] }
                : { stones: [{ 
                    ...gemData.stone, 
                    primary: true,
                    quantity: gemData.stone.quantity || 1
                  }] };
              handleGemSave(gemInfo);
            }} 
            variant="contained" 
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default JewelryEdit;